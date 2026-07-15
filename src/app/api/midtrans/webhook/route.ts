import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  try {
    const textBody = await request.text();
    if (!textBody) return NextResponse.json({ status: "OK" });

    const body = JSON.parse(textBody);
    const { order_id, transaction_status, fraud_status } = body;

    if (!order_id || !transaction_status || order_id.startsWith("payment_notif_test")) {
      return NextResponse.json({ status: "OK" });
    }

    const isSettled = transaction_status === "settlement" || (transaction_status === "capture" && fraud_status === "accept");

    if (isSettled) {
      // =========================================================================
      // A. JIKA TRANSAKSI ADALAH TOP-UP WALLET FUNDS (INV: DEP-XXXX)
      // =========================================================================
      if (order_id.startsWith("DEP-")) {
        const userId = body.custom_field1; // custom_field1 berisi user_id di API route topup
        const usdAmount = Number(body.custom_field2); // custom_field2 berisi nominal USD murni sebelum dikali 15rb

        if (userId && usdAmount) {
          // 1. Ambil atau buat data dompet user
          let { data: wallet } = await supabaseAdmin
            .from("user_wallets")
            .select("id, balance")
            .eq("user_id", userId)
            .maybeSingle();

          if (!wallet) {
            const { data: newWallet } = await supabaseAdmin
              .from("user_wallets")
              .insert({ user_id: userId, balance: 0.00 })
              .select()
              .single();
            wallet = newWallet;
          }

          const currentBalance = wallet ? Number(wallet.balance) : 0;
          const updatedBalance = currentBalance + usdAmount;

          // 2. Update saldo dompet di tabel user_wallets
          await supabaseAdmin
            .from("user_wallets")
            .update({ balance: updatedBalance, updated_at: new Date().toISOString() })
            .eq("id", wallet?.id);

          // 3. Catat transaksi riwayat uang masuk ke wallet_transactions
          await supabaseAdmin
            .from("wallet_transactions")
            .insert({
              wallet_id: wallet?.id,
              type: "deposits",
              amount: usdAmount,
              description: `Top up wallet via Midtrans Gateway ($${usdAmount.toFixed(2)})`,
              payment_reference_id: order_id,
              status: "completed"
            });
        }
      } 
      
      // =========================================================================
      // B. JIKA TRANSAKSI ADALAH BELANJA PRODUK BIASA (INV: INV-XXXX)
      // =========================================================================
      else if (order_id.startsWith("INV-")) {
        // Tangkap kode affiliate yang kita titipkan di custom_field1 route checkout midtrans
        const affiliateCode = body.custom_field1 || null;

        const { data: orderData } = await supabaseAdmin
          .from("orders")
          .update({ status: "processing" })
          .eq("invoice_number", order_id)
          .select()
          .single();

        if (orderData) {
          // Ambil item produk di order ini beserta rate komisi afiliasi aslinya dari tabel products
          const { data: items } = await supabaseAdmin
            .from("order_items")
            .select("*, products(id, title, affiliate_commission_rate)")
            .eq("order_id", orderData.id);

          if (items) {
            for (const item of items) {
              const finalPrice = Number(item.price);
              const vendorId = item.vendor_id;
              const vendorShipCost = Number(item.shipping_fee_vendor || 0);

              let affiliateData = null;
              let commissionAmount = 0;

              // 1. HITUNG CIPRATAN AFFILIATE DINAMIS DARI RATE DB
              if (affiliateCode) {
                const { data: aff } = await supabaseAdmin
                  .from("product_affiliates")
                  .select("id, user_id")
                  .eq("affiliate_code", affiliateCode)
                  .eq("product_id", item.product_id)
                  .eq("status", true)
                  .maybeSingle();

                if (aff) {
                  affiliateData = aff;
                  // Ambil persentase asli dari kolom database produk, default ke 0 jika NULL
                  const productCommissionRate = Number((item.products as any)?.affiliate_commission_rate || 0);
                  commissionAmount = (finalPrice * item.quantity) * (productCommissionRate / 100);
                }
              }

              const totalItemEarnings = (finalPrice * item.quantity) + vendorShipCost;
              // Pendapatan bersih vendor dikurangi cipratan makelar
              const vendorNetEarnings = totalItemEarnings - commissionAmount;
              
              // 2. DISTRIBUSI KELUAR KE WALLET VENDOR
              let { data: vendorWallet } = await supabaseAdmin
                .from("user_wallets")
                .select("id, balance")
                .eq("user_id", vendorId)
                .maybeSingle();

              if (!vendorWallet) {
                const { data: newW } = await supabaseAdmin
                  .from("user_wallets")
                  .insert({ user_id: vendorId, balance: 0.00 })
                  .select()
                  .single();
                vendorWallet = newW;
              }

              const currentBal = Number(vendorWallet?.balance);
              
              await supabaseAdmin
                .from("user_wallets")
                .update({ balance: currentBal + vendorNetEarnings, updated_at: new Date().toISOString() })
                .eq("id", vendorWallet?.id);

              await supabaseAdmin
                .from("wallet_transactions")
                .insert({
                  wallet_id: vendorWallet?.id,
                  type: "earnings",
                  amount: vendorNetEarnings,
                  description: `Earnings from order #${order_id} ${commissionAmount > 0 ? '(Deducted by affiliate commission)' : ''}`,
                  payment_reference_id: order_id,
                  status: "completed"
                });

              // 3. DISTRIBUSI KELUAR KE WALLET MAKELAR (AFFILIATE) JIKA VALID
              if (affiliateData && commissionAmount > 0) {
                // A. Catat riwayat ke affiliate_earnings
                await supabaseAdmin.from("affiliate_earnings").insert({
                  affiliate_id: affiliateData.id,
                  order_id: orderData.id,
                  buyer_id: orderData.buyer_id,
                  commission_amount: commissionAmount,
                  payout_status: "approved"
                });

                // B. Update counter total sales di tabel product_affiliates
                const { data: currentAff } = await supabaseAdmin
                  .from("product_affiliates")
                  .select("total_sales")
                  .eq("id", affiliateData.id)
                  .single();

                await supabaseAdmin
                  .from("product_affiliates")
                  .update({ total_sales: (currentAff?.total_sales || 0) + 1 })
                  .eq("id", affiliateData.id);

                // C. Kirim saldo masuk ke wallet milik si makelar
                let { data: affWallet } = await supabaseAdmin
                  .from("user_wallets")
                  .select("id, balance")
                  .eq("user_id", affiliateData.user_id)
                  .maybeSingle();

                if (!affWallet) {
                  const { data: newW } = await supabaseAdmin
                    .from("user_wallets")
                    .insert({ user_id: affiliateData.user_id, balance: 0.00 })
                    .select()
                    .single();
                  affWallet = newW;
                }

                const currentAffBal = Number(affWallet?.balance);

                await supabaseAdmin
                  .from("user_wallets")
                  .update({ balance: currentAffBal + commissionAmount, updated_at: new Date().toISOString() })
                  .eq("id", affWallet?.id);

                // D. Catat mutasi masuk tipe 'referral' di riwayat mutasi makelar
                await supabaseAdmin
                  .from("wallet_transactions")
                  .insert({
                    wallet_id: affWallet?.id,
                    type: "referral",
                    amount: commissionAmount,
                    description: `Referral commission from product ${(item.products as any)?.title?.substring(0, 30)} (Order #${order_id})`,
                    payment_reference_id: order_id,
                    status: "completed"
                  });
              }
            }
          }

          // Bersihkan isi keranjang belanja pembeli karena pembayaran Midtrans sudah settlement
          await supabaseAdmin.from("carts").delete().eq("user_id", orderData.buyer_id);
        }
      }
    }

    return NextResponse.json({ status: "OK" });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
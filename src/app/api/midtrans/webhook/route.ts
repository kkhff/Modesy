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
        // Ekstrak metadata custom dari order_id atau cari log deposit pending jika ada.
        // Di sini kita ambil data user id yang diletakkan di metadata pembayaran midtrans, 
        // atau kita selipkan userId di dalam manifest order_id. 
        // Agar aman, mari pecah order_id: DEP-[TIMESTAMP]-[USERID_PART]
        // Alternatif terbaik: Midtrans melemparkan custom_field jika kita set di route generator.
        
        const userId = body.custom_field1; // Kita akan set custom_field1 berisi user_id di API route generator nanti.
        const usdAmount = Number(body.custom_field2); // custom_field2 berisi nominal USD murni sebelum dikali 15rb.

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
        const { data: orderData } = await supabaseAdmin
          .from("orders")
          .update({ status: "processing" })
          .eq("invoice_number", order_id)
          .select()
          .single();

        if (orderData) {
          const { data: items } = await supabaseAdmin
            .from("order_items")
            .select("vendor_id, price, quantity, shipping_fee_vendor")
            .eq("order_id", orderData.id);

          if (items) {
            for (const item of items) {
              const totalEarningsUsd = (Number(item.price) * item.quantity) + Number(item.shipping_fee_vendor);
              
              let { data: vendorWallet } = await supabaseAdmin
                .from("user_wallets")
                .select("id, balance")
                .eq("user_id", item.vendor_id)
                .maybeSingle();

              if (!vendorWallet) {
                const { data: newW } = await supabaseAdmin
                  .from("user_wallets")
                  .insert({ user_id: item.vendor_id, balance: 0.00 })
                  .select()
                  .single();
                vendorWallet = newW;
              }

              const currentBal = Number(vendorWallet?.balance);
              
              // Tambah saldo vendor
              await supabaseAdmin
                .from("user_wallets")
                .update({ balance: currentBal + totalEarningsUsd, updated_at: new Date().toISOString() })
                .eq("id", vendorWallet?.id);

              // Catat riwayat log earnings vendor
              await supabaseAdmin
                .from("wallet_transactions")
                .insert({
                  wallet_id: vendorWallet?.id,
                  type: "earnings",
                  amount: totalEarningsUsd,
                  description: `Earnings from order #${order_id}`,
                  status: "completed"
                });
            }
          }

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
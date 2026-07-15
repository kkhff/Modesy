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
        const userId = body.custom_field1; 
        const usdAmount = Number(body.custom_field2); 

        if (userId && usdAmount) {
          let { data: wallet, error: walletFindError } = await supabaseAdmin
            .from("user_wallets")
            .select("id, balance")
            .eq("user_id", userId)
            .maybeSingle();

          if (walletFindError) throw new Error(`[Find Wallet Error]: ${walletFindError.message}`);

          if (!wallet) {
            const { data: newWallet, error: walletInsertError } = await supabaseAdmin
              .from("user_wallets")
              .insert({ user_id: userId, balance: 0.00 })
              .select()
              .single();
            
            if (walletInsertError) throw new Error(`[Create Wallet Error]: ${walletInsertError.message}`);
            wallet = newWallet;
          }

          const currentBalance = wallet ? Number(wallet.balance) : 0;
          const updatedBalance = currentBalance + usdAmount;

          const { error: walletUpdateError } = await supabaseAdmin
            .from("user_wallets")
            .update({ balance: updatedBalance, updated_at: new Date().toISOString() })
            .eq("id", wallet?.id);

          if (walletUpdateError) throw new Error(`[Update Balance Error]: ${walletUpdateError.message}`);

          const { error: txInsertError } = await supabaseAdmin
            .from("wallet_transactions")
            .insert({
              wallet_id: wallet?.id,
              type: "deposits",
              amount: usdAmount,
              description: `Top up wallet via Midtrans Gateway ($${usdAmount.toFixed(2)})`,
              payment_reference_id: order_id,
              order_id: null,
              status: "completed"
            });

          if (txInsertError) throw new Error(`[Deposit History Error]: ${txInsertError.message}`);
        }
      } 
      
      // =========================================================================
      // B. JIKA TRANSAKSI ADALAH BELANJA PRODUK BIASA (INV: INV-XXXX)
      // =========================================================================
      else if (order_id.startsWith("INV-")) {
        const affiliateCode = body.custom_field1 || null;

        const { data: orderData, error: orderUpdateError } = await supabaseAdmin
          .from("orders")
          .update({ status: "processing" })
          .eq("invoice_number", order_id)
          .select()
          .single();

        if (orderUpdateError) throw new Error(`[Update Order Status Error]: ${orderUpdateError.message}`);

        if (orderData) {
          const { data: items, error: itemsFetchError } = await supabaseAdmin
            .from("order_items")
            .select("*, products(id, title, affiliate_commission_rate)")
            .eq("order_id", orderData.id);

          if (itemsFetchError) throw new Error(`[Fetch Order Items Error]: ${itemsFetchError.message}`);

          if (items) {
            for (const item of items) {
              const finalPrice = Number(item.price);
              const vendorId = item.vendor_id;
              const vendorShipCost = Number(item.shipping_fee_vendor || 0);

              let affiliateData = null;
              let commissionAmount = 0;

              if (affiliateCode) {
                const { data: aff, error: affFindError } = await supabaseAdmin
                  .from("product_affiliates")
                  .select("id, user_id")
                  .eq("affiliate_code", affiliateCode)
                  .eq("product_id", item.product_id)
                  .eq("status", true)
                  .maybeSingle();

                if (affFindError) throw new Error(`[Find Affiliate Code Error]: ${affFindError.message}`);

                if (aff) {
                  affiliateData = aff;
                  const productCommissionRate = Number((item.products as any)?.affiliate_commission_rate || 0);
                  commissionAmount = (finalPrice * item.quantity) * (productCommissionRate / 100);
                }
              }

              const totalItemEarnings = (finalPrice * item.quantity) + vendorShipCost;
              const vendorNetEarnings = totalItemEarnings - commissionAmount;
              
              let { data: vendorWallet, error: vendorWalletError } = await supabaseAdmin
                .from("user_wallets")
                .select("id, balance")
                .eq("user_id", vendorId)
                .maybeSingle();

              if (vendorWalletError) throw new Error(`[Find Vendor Wallet Error]: ${vendorWalletError.message}`);

              if (!vendorWallet) {
                const { data: newW, error: newVendorWalletError } = await supabaseAdmin
                  .from("user_wallets")
                  .insert({ user_id: vendorId, balance: 0.00 })
                  .select()
                  .single();
                
                if (newVendorWalletError) throw new Error(`[Create Vendor Wallet Error]: ${newVendorWalletError.message}`);
                vendorWallet = newW;
              }

              const currentBal = Number(vendorWallet?.balance);
              
              const { error: vWalletUpdateError } = await supabaseAdmin
                .from("user_wallets")
                .update({ balance: currentBal + vendorNetEarnings, updated_at: new Date().toISOString() })
                .eq("id", vendorWallet?.id);

              if (vWalletUpdateError) throw new Error(`[Update Vendor Balance Error]: ${vWalletUpdateError.message}`);

              const { error: vTxInsertError } = await supabaseAdmin
                .from("wallet_transactions")
                .insert({
                  wallet_id: vendorWallet?.id,
                  type: "earnings",
                  amount: vendorNetEarnings,
                  description: `Earnings from order #${order_id} ${commissionAmount > 0 ? '(Deducted by affiliate commission)' : ''}`,
                  payment_reference_id: order_id,
                  order_id: orderData.id, 
                  status: "completed"
                });

              if (vTxInsertError) throw new Error(`[Insert Vendor Log Error]: ${vTxInsertError.message}`);

              if (affiliateData && commissionAmount > 0) {
                const { error: affEarningError } = await supabaseAdmin
                  .from("affiliate_earnings")
                  .insert({
                    affiliate_id: affiliateData.id,
                    order_id: orderData.id, 
                    buyer_id: orderData.buyer_id,
                    commission_amount: commissionAmount,
                    payout_status: "approved"
                  });

                if (affEarningError) throw new Error(`[Insert Affiliate Earnings Error]: ${affEarningError.message}`);

                const { data: currentAff, error: currentAffError } = await supabaseAdmin
                  .from("product_affiliates")
                  .select("total_sales")
                  .eq("id", affiliateData.id)
                  .single();

                if (currentAffError) throw new Error(`[Fetch Current Affiliate Total Sales Error]: ${currentAffError.message}`);

                const { error: affSalesUpdateError } = await supabaseAdmin
                  .from("product_affiliates")
                  .update({ total_sales: (currentAff?.total_sales || 0) + 1 })
                  .eq("id", affiliateData.id);

                if (affSalesUpdateError) throw new Error(`[Update Affiliate Total Sales Error]: ${affSalesUpdateError.message}`);

                let { data: affWallet, error: affWalletFindError } = await supabaseAdmin
                  .from("user_wallets")
                  .select("id, balance")
                  .eq("user_id", affiliateData.user_id)
                  .maybeSingle();

                if (affWalletFindError) throw new Error(`[Find Affiliate Wallet Error]: ${affWalletFindError.message}`);

                if (!affWallet) {
                  const { data: newW, error: newAffWalletError } = await supabaseAdmin
                    .from("user_wallets")
                    .insert({ user_id: affiliateData.user_id, balance: 0.00 })
                    .select()
                    .single();
                  
                  if (newAffWalletError) throw new Error(`[Create Affiliate Wallet Error]: ${newAffWalletError.message}`);
                  affWallet = newW;
                }

                const currentAffBal = Number(affWallet?.balance);

                const { error: affBalanceUpdateError } = await supabaseAdmin
                  .from("user_wallets")
                  .update({ balance: currentAffBal + commissionAmount, updated_at: new Date().toISOString() })
                  .eq("id", affWallet?.id);

                if (affBalanceUpdateError) throw new Error(`[Update Affiliate Balance Error]: ${affBalanceUpdateError.message}`);

                const { error: affTxInsertError } = await supabaseAdmin
                  .from("wallet_transactions")
                  .insert({
                    wallet_id: affWallet?.id,
                    type: "referral",
                    amount: commissionAmount,
                    description: `Referral commission from product ${(item.products as any)?.title?.substring(0, 30)} (Order #${order_id})`,
                    payment_reference_id: order_id,
                    order_id: orderData.id, 
                    status: "completed"
                  });

                if (affTxInsertError) throw new Error(`[Insert Affiliate Log Error]: ${affTxInsertError.message}`);
              }
            }
          }

          const { error: cartDeleteError } = await supabaseAdmin.from("carts").delete().eq("user_id", orderData.buyer_id);
          if (cartDeleteError) console.error("[Warning - Cart Delete Failed]:", cartDeleteError.message);
        }
      }
    }

    return NextResponse.json({ status: "OK" });
  } catch (error: any) {
    console.error("🔴 WEBHOOK CRASHED:", error.message);
    // Mengembalikan status 500 lengkap dengan pesan error spesifik agar tercatat di log Midtrans Dashboard lu
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
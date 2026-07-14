import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Menggunakan service role key karena webhook membutuhkan bypass RLS untuk update wallet & order
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { order_id, transaction_status, fraud_status } = body;

    if (transaction_status === "settlement" || (transaction_status === "capture" && fraud_status === "accept")) {
      
      // 1. Update Status Order menjadi 'processing'
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from("orders")
        .update({ status: "processing" })
        .eq("invoice_number", order_id)
        .select()
        .single();

      if (orderError || !orderData) throw new Error("Order not found");

      // 2. Ambil semua item di dalam order untuk identifikasi Vendor & kalkulasi Wallet penjual
      const { data: items, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select("vendor_id, price, quantity, shipping_fee_vendor")
        .eq("order_id", orderData.id);

      if (!itemsError && items) {
        // 3. Distribusikan dana ke masing-masing dompet/wallet penjual (Harga Barang + Ongkir Toko)
        for (const item of items) {
          const totalEarningsUsd = (Number(item.price) * item.quantity) + Number(item.shipping_fee_vendor);
          
          // Ambil saldo wallet lama penjual
          const { data: wallet } = await supabaseAdmin
            .from("user_wallets")
            .select("balance")
            .eq("user_id", item.vendor_id)
            .maybeSingle();

          const currentBalance = wallet ? Number(wallet.balance) : 0;

          await supabaseAdmin
            .from("user_wallets")
            .upsert({
              user_id: item.vendor_id,
              balance: currentBalance + totalEarningsUsd,
              updated_at: new Date().toISOString()
            }, { onConflict: "user_id" });
        }
      }

      // 4. Bersihkan/Hapus isi keranjang pembeli karena transaksi sukses
      await supabaseAdmin
        .from("carts")
        .delete()
        .eq("user_id", orderData.buyer_id);
    }

    return NextResponse.json({ status: "OK" });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
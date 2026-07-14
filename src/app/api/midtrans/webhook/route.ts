import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  try {
    // 1. Ambil teks body terlebih dahulu untuk menghindari crash pembacaan JSON kosong
    const textBody = await request.text();
    
    // Jika body kosong (fitur PING/Test Midtrans), langsung bypass sukses
    if (!textBody) {
      return NextResponse.json({ status: "OK", message: "Ping received successfully" });
    }

    const body = JSON.parse(textBody);
    const { order_id, transaction_status, fraud_status } = body;

    // 2. Jika isi data krusial tidak ada, anggap ini testing dan langsung kembalikan OK
    if (!order_id || !transaction_status) {
      return NextResponse.json({ status: "OK", message: "Test notification received" });
    }

    // Jalankan logika bisnis hanya jika statusnya settlement atau capture accept
    if (transaction_status === "settlement" || (transaction_status === "capture" && fraud_status === "accept")) {
      
      // Update Status Order menjadi 'processing'
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from("orders")
        .update({ status: "processing" })
        .eq("invoice_number", order_id)
        .select()
        .single();

      if (orderError || !orderData) throw new Error("Order not found");

      // Ambil semua item di dalam order untuk identifikasi Vendor
      const { data: items, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select("vendor_id, price, quantity, shipping_fee_vendor")
        .eq("order_id", orderData.id);

      if (!itemsError && items) {
        for (const item of items) {
          const totalEarningsUsd = (Number(item.price) * item.quantity) + Number(item.shipping_fee_vendor);
          
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

      // Bersihkan isi keranjang pembeli
      await supabaseAdmin
        .from("carts")
        .delete()
        .eq("user_id", orderData.buyer_id);
    }

    return NextResponse.json({ status: "OK" });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    // Mengembalikan objek error terstruktur agar lebih mudah dilacak di Vercel Logs
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
// @ts-ignore
import midtransClient from "midtrans-client";

export async function POST(request: Request) {
  try {
    // 1. Inisialisasi Supabase Server (Read Session)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // 2. Proteksi Session Login
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please login again." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.items || !body.shippingCost || !body.addressId || !body.shippingMethods) {
      return NextResponse.json({ error: "Missing required checkout payloads." }, { status: 400 });
    }

    const { items, shippingCost, addressId, shippingMethods, amount } = body;

    // Ambil key langsung dari variabel env
    const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim();

    if (!serverKey || !clientKey) {
      return NextResponse.json({ error: "Midtrans keys are missing in environment variables." }, { status: 500 });
    }

    // Inisialisasi Midtrans Snap SDK
    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: serverKey,
      clientKey: clientKey
    });

    const orderId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // 🌟 3. KALKULASI ESTIMASI HARI AUTO-COMPLETE BERDASARKAN JARAK (SERVER-SIDE)
    let maxDaysEstimation = 2; // Default base minimum days

    // Ambil profile pembeli saat ini untuk pencocokan wilayah
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("country, state_or_province, city")
      .eq("id", session.user.id)
      .maybeSingle();

    // Loop items untuk mencari durasi estimasi terlama dari produk yang dibeli
    for (const item of items) {
      const baseDaysStr = item.delivery_time || "2-3";
      const baseMin = Number(baseDaysStr.split("-")[0]) || 2;
      let currentItemMin = baseMin;

      const pCountry = (item.country || "").toLowerCase().trim();
      const pState = (item.state || "").toLowerCase().trim();
      const pCity = (item.city || "").toLowerCase().trim();

      const uCountry = (buyerProfile?.country || "").toLowerCase().trim() || pCountry;
      const uState = (buyerProfile?.state_or_province || "").toLowerCase().trim();
      const uCity = (buyerProfile?.city || "").toLowerCase().trim();

      if (pCountry !== uCountry) {
        currentItemMin += 7;
      } else if (pState !== uState && uState !== "") {
        currentItemMin += 2;
      } else if (pCity !== uCity && uCity !== "") {
        currentItemMin += 1;
      }

      if (currentItemMin > maxDaysEstimation) {
        maxDaysEstimation = currentItemMin;
      }
    }

    // Hitung tanggal riil auto-complete (Hari ini + maxDaysEstimation)
    const estimatedCompleteDate = new Date();
    estimatedCompleteDate.setDate(estimatedCompleteDate.getDate() + maxDaysEstimation);

    // 🌟 4. SIMPAN DATA TRANSAKSI KE TABEL ORDERS (Status Awal: pending)
    const { data: newOrder, error: insertError } = await supabase
      .from("orders")
      .insert({
        invoice_number: orderId,
        buyer_id: session.user.id,
        address_id: addressId, // 👈 HAPUS BUNGKUSAN Number() DISINI, biarkan string UUID mentah
        total_amount: Number(amount),
        shipping_cost: Number(shippingCost),
        payment_method: "midtrans",
        status: "pending",
        estimated_complete_at: estimatedCompleteDate.toISOString()
      })
      .select()
      .single();

   if (insertError) {
      console.error("Failed to insert order:", insertError);
      // ✅ UBAH INI: Kirim langsung detail pesan error dari Supabase ke client browser
      return NextResponse.json({ 
        success: false, 
        error: `Supabase Order Error: ${insertError.message} (${insertError.code}) - Detail: ${insertError.details || 'none'}` 
      }, { status: 400 });
    }

    // 🌟 LOGIKA MAP ITEM DETAILS KE RUPIAH (KURS 15.000)
    let grossAmount = 0;
    const midtransItemDetails = [];

    for (const item of items) {
      const priceInIdr = Math.round(Number(item.price) * 15000);
      grossAmount += priceInIdr * item.quantity;
      
      midtransItemDetails.push({
        id: item.id,
        price: priceInIdr,
        quantity: item.quantity,
        name: item.title.substring(0, 50)
      });

      // Simpan rincian barang per vendor ke tabel order_items
      const vendorId = item.vendor_id || item.user_id;
      const vendorShipCost = shippingMethods[vendorId]?.cost || 0;

      await supabase.from("order_items").insert({
        order_id: newOrder.id,
        product_id: item.id,
        vendor_id: vendorId,
        quantity: item.quantity,
        price: Number(item.price),
        shipping_fee_vendor: Number(vendorShipCost)
      });
    }

    // Tambahkan Ongkir global sebagai Item tersendiri di Midtrans
    const totalShippingIdr = Math.round(Number(shippingCost) * 15000);
    if (totalShippingIdr > 0) {
      grossAmount += totalShippingIdr;
      midtransItemDetails.push({
        id: "SHIPPING-FEE",
        price: totalShippingIdr,
        quantity: 1,
        name: "Shipping Delivery Fee"
      });
    }

    // Pengecekan batas minimum transaksi mutlak Midtrans
    if (grossAmount < 10000) {
      return NextResponse.json({ error: "Minimum checkout amount is Rp 10.000" }, { status: 400 });
    }

    // 5. Susun Parameter Payload Sesuai Standar SDK
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount
      },
      item_details: midtransItemDetails,
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: session.user.user_metadata?.first_name || "Customer",
        email: session.user.email
      }
    };

    // 6. Minta Token Snap lewat SDK Resmi
    const transaction = await snap.createTransaction(parameter);

    return NextResponse.json({ 
      success: true, 
      token: transaction.token, 
      orderId 
    });

  } catch (error: any) {
    console.error("Midtrans Client SDK Crash:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Communication with Midtrans failed." 
    }, { status: 500 });
  }
}
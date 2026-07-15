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

    // 3. Ambil dan Validasi Payload Nominal dari Modal TopUp
    const body = await request.json().catch(() => null);
    if (!body || !body.amount) {
      return NextResponse.json({ error: "Missing amount value." }, { status: 400 });
    }

    const { amount } = body; // Nominal murni dalam bentuk USD (misal: 10 atau 50.00)

    // 🌟 4. KALKULASI & KONVERSI KURS USD KE RUPIAH (X 15.000) KHUSUS UNTUK GATEWAY MIDTRANS
    const priceInIdr = Math.round(Number(amount) * 15000);

    // Pastikan nominal konversi IDR lolos batas minimal Midtrans Rp 10.000
    if (priceInIdr < 10000) {
      return NextResponse.json({ error: "Minimum top-up amount is $1.00 USD (Rp 15.000)" }, { status: 400 });
    }

    // Ambil Key dari Environment Variables
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

    // Buat Kode Unik khusus Top-Up berawalan DEP- (Deposit)
    const orderId = `DEP-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // 5. Susun Parameter Payload Sesuai Standar SDK Midtrans
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: priceInIdr
      },
      item_details: [{
        id: "WALLET-TOPUP",
        price: priceInIdr,
        quantity: 1,
        name: `Top Up Wallet Balance $${Number(amount).toFixed(2)}`
      }],
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: session.user.user_metadata?.first_name || "Member",
        email: session.user.email
      },
      // 🌟 KUNCI WEBHOOK: Kirim data krusial lewat custom fields agar ditangkap webhook sukses
      custom_field1: session.user.id, // Menyimpan UUID User pembeli untuk pencarian user_wallets
      custom_field2: Number(amount)   // Menyimpan nominal USD asli sebelum dikonversi ke Rupiah
    };

    // 6. Minta Token Snap ke Server Midtrans
    const transaction = await snap.createTransaction(parameter);

    return NextResponse.json({ 
      success: true, 
      token: transaction.token, 
      orderId 
    });

  } catch (error: any) {
    console.error("Wallet Topup Token Generator Crash:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to communicate with Midtrans gateway." 
    }, { status: 500 });
  }
}
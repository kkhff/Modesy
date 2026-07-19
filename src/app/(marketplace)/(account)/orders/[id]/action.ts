"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

export async function cancelOrderAction(orderId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    // 1. Cek Sesi Auth Toko
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Session expired." };

    // 2. Tarik data order utama untuk validasi status aslinya
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("status, buyer_id, total_amount")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError || !order) return { success: false, error: "Order record not found." };
    if (order.buyer_id !== user.id) return { success: false, error: "Unauthorized transaction cancel request." };
    
    const currentStatus = order.status;

    if (currentStatus === "completed" || currentStatus === "cancelled") {
      return { success: false, error: `Cannot cancel order with status: ${currentStatus}` };
    }

    // 3. Eksekusi Perubahan Status Order Utama Menjadi 'cancelled'
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (updateError) throw updateError;

    // 🌟 4. KONDISIONAL REFUND UANG KE WALLET BUYER
    if (currentStatus === "processing") {
      const refundAmount = Number(order.total_amount || 0);

      if (refundAmount > 0) {
        // Tarik saldo dompet saat ini milik buyer
        const { data: wallet, error: walletFetchError } = await supabase
          .from("user_wallets")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (walletFetchError) throw new Error("Failed to fetch wallet repository.");

        if (wallet) {
          // Update kalkulasi saldo baru (Atomic Addition)
          const newBalance = Number(wallet.balance || 0) + refundAmount;

          const { error: walletUpdateError } = await supabase
            .from("user_wallets")
            .update({ balance: newBalance })
            .eq("user_id", user.id);

          if (walletUpdateError) throw walletUpdateError;
        }
      }
    }

    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (err: any) {
    console.error("🔴 Cancel Order Backend Error:", err.message);
    return { success: false, error: err.message || "Failed to process cancellation requests." };
  }
}
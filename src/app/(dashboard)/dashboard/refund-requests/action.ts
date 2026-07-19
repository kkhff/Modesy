"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

// Aksi update status tiket refund oleh vendor (Approve / Decline)
export async function updateRefundStatusAction(ticketId: string, nextStatus: "approved" | "rejected") {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized session." };

    // Validasi apakah tiket ini benar milik produk vendor yang sedang login
    const { data: checkTicket, error: checkError } = await supabase
      .from("refund_requests")
      .select(`id, order_items(vendor_id)`)
      .eq("id", ticketId)
      .maybeSingle();

    if (checkError || !checkTicket) throw new Error("Refund ticket data corrupt.");
    if (checkTicket.order_items?.[0]?.vendor_id !== user.id) {
  return { success: false, error: "You do not own this product entry." };
}

    // Update status refund_requests
    const { error: updateError } = await supabase
      .from("refund_requests")
      .update({ 
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", ticketId);

    if (updateError) throw updateError;

    // 💡 OPSIONAL LOGIC WALLET: Kalau 'approved', di sinilah lu bisa panggil mutasi 
    // potong saldo wallet vendor balik ke wallet pembeli jika sistem lu udah auto-refund.

    revalidatePath(`/dashboard/refund-requests/${ticketId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update status." };
  }
}
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

// 1. Tarik daftar produk dari order yang berstatus 'completed' untuk dropdown
export async function getCompletedOrderItemsAction() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, data: [] };

  const { data: items, error } = await supabase
    .from("order_items")
    .select(`
      id,
      quantity,
      total_price,
      orders!inner(id, invoice_number, status, buyer_id),
      products(title)
    `)
    .eq("orders.buyer_id", user.id)
    .eq("orders.status", "completed");

  if (error) return { success: false, data: [] };
  return { success: true, data: items };
}

// 2. Submit Pengajuan Refund Baru beserta Pesan Awalnya
export async function createRefundRequestAction(orderItemId: string, reasonMessage: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Session expired." };
    if (!orderItemId || !reasonMessage.trim()) return { success: false, error: "Missing required fields." };

    // Bikin tiket refund utama
    const { data: ticket, error: ticketErr } = await supabase
      .from("refund_requests")
      .insert({
        user_id: user.id,
        order_item_id: orderItemId,
        status: "processing"
      })
      .select()
      .single();

    if (ticketErr || !ticket) throw ticketErr || new Error("Failed to create refund ticket.");

    // Masukkan alasan pesan ke tabel khusus pesan diskusi
    const { error: msgErr } = await supabase
      .from("refund_messages")
      .insert({
        refund_request_id: ticket.id,
        sender_id: user.id,
        message: reasonMessage.trim()
      });

    if (msgErr) throw msgErr;

    revalidatePath("/refund-requests");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit request." };
  }
}

// 3. Tambah Pesan Obrolan Baru di Ruang Diskusi Refund
export async function sendRefundMessageAction(refundRequestId: string, messageText: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { error } = await supabase
      .from("refund_messages")
      .insert({
        refund_request_id: refundRequestId,
        sender_id: user.id,
        message: messageText.trim()
      });

    if (error) throw error;

    revalidatePath(`/refund-requests/${refundRequestId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


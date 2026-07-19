"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

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

    // 1. Validasi tiket dan ambil data keuangan terkait (buyer_id, total_price, vat_price, invoice_number)
    const { data: checkTicket, error: checkError } = await supabase
      .from("refund_requests")
      .select(`
        id, 
        user_id, 
        order_item_id,
        order_items(
          total_price, 
          vat_price,
          vendor_id, 
          shipping_fee_vendor,
          orders(invoice_number, id)
        )
      `)
      .eq("id", ticketId)
      .maybeSingle();

    if (checkError || !checkTicket) throw new Error("Refund ticket data corrupt.");
    
    // Pastikan order_items dibaca sebagai objek tunggal (bukan array)
    const itemData = Array.isArray(checkTicket.order_items) ? checkTicket.order_items[0] : checkTicket.order_items;
    if (!itemData) throw new Error("Linked order item data not found.");

    // Validasi kepemilikan vendor
    if (itemData.vendor_id !== user.id) {
      return { success: false, error: "You do not own this product entry." };
    }

    // 2. Update status refund_requests ke database terlebih dahulu
    const { error: updateError } = await supabase
      .from("refund_requests")
      .update({ 
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", ticketId);

    if (updateError) throw updateError;

    if (nextStatus === "approved") {
      const buyerId = checkTicket.user_id;
      const vendorId = itemData.vendor_id;
      const orderInvoiceStr = (itemData.orders as any)?.invoice_number || "INV-UNKNOWN";
  const orderId = (itemData.orders as any)?.id;

      // Dana refund item = total harga barang + nominal pajaknya
      const refundAmount = Number(itemData.total_price || 0) + Number(itemData.vat_price || 0);

      if (refundAmount > 0) {
        // A. Ambil Dompet Pembeli (Buyer)
        const { data: buyerWallet } = await supabase.from("user_wallets").select("id, balance").eq("user_id", buyerId).maybeSingle();
        // B. Ambil Dompet Penjual (Vendor)
        const { data: vendorWallet } = await supabase.from("user_wallets").select("id, balance").eq("user_id", vendorId).maybeSingle();

        if (!buyerWallet || !vendorWallet) {
          throw new Error("Failed to clear refund process: Wallet system profile not initialized.");
        }

        // C. Update Saldo Dompet Pembeli (Tambah)
        const newBuyerBalance = Number(buyerWallet.balance) + refundAmount;
        await supabase
          .from("user_wallets")
          .update({ balance: newBuyerBalance, updated_at: new Date().toISOString() })
          .eq("id", buyerWallet.id);

        // D. Update Saldo Dompet Vendor (Kurang)
        // Catatan: Karena net earnings vendor pas CO dikurangi komisi affiliate, dana refund idealnya dikurangi rate tersebut.
        // Tapi untuk mempermudah dev, kita tarik full price barang + tax dari dompet vendor.
        const newVendorBalance = Number(vendorWallet.balance) - refundAmount;
        await supabase
          .from("user_wallets")
          .update({ balance: newVendorBalance, updated_at: new Date().toISOString() })
          .eq("id", vendorWallet.id);

        // E. Catat Log Transaksi 'refund' Masuk untuk Pembeli
        await supabase.from("wallet_transactions").insert({
          wallet_id: buyerWallet.id,
          type: "refund",
          amount: refundAmount,
          description: `Refund received for item in order #${orderInvoiceStr} (Ticket #${ticketId})`,
          payment_reference_id: orderInvoiceStr,
          order_id: orderId,
          status: "completed"
        });

        // F. Catat Log Transaksi 'refund_deduction' Keluar untuk Vendor
        await supabase.from("wallet_transactions").insert({
          wallet_id: vendorWallet.id,
          type: "expenses", // Menggunakan tipe expenses/deduction log
          amount: refundAmount,
          description: `Refund deduction paid out to buyer for order #${orderInvoiceStr} (Ticket #${ticketId})`,
          payment_reference_id: orderInvoiceStr,
          order_id: orderId,
          status: "completed"
        });
      }
    }

    revalidatePath(`/dashboard/refund-requests/${ticketId}`);
    return { success: true };
  } catch (err: any) {
    console.error("🔴 Auto Refund Wallet Error:", err.message);
    return { success: false, error: err.message || "Failed to update status." };
  }
}
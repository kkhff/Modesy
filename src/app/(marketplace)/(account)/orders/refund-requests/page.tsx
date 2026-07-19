"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { getCompletedOrderItemsAction, createRefundRequestAction } from "./action";

export default function RefundRequestsListPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<any[]>([]);
  const [completedItems, setCompletedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Ambil info user yang sedang login saat ini
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user) return;

      const user = authData.user;

      // 2. Pasang filter .eq("user_id", user.id) agar terisolasi hanya milik dia
      // 🌟 PERBAIKAN: Menambahkan kolom id pada orders agar bisa dipakai untuk link redirect
      const { data: ticketData, error: ticketError } = await supabase
        .from("refund_requests")
        .select(`
          id, status, created_at,
          order_items(
            quantity, total_price,
            products(title, image_urls),
            orders(id, invoice_number)
          )
        `)
        .eq("user_id", user.id) // 🔒 Mengunci data agar hanya memuat milik user aktif
        .order("created_at", { ascending: false });

      if (ticketError) throw ticketError;

      const resItems = await getCompletedOrderItemsAction();
      
      setRequests(ticketData || []);
      setCompletedItems(resItems.data || []);
    } catch (err: any) {
      console.error("🔴 Load Refund List Error:", err.message);
      toast.error(err.message || "Failed to load layout data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !reason.trim()) return toast.error("Please fill all fields.");
    
    setSubmitting(true);
    const res = await createRefundRequestAction(selectedItem, reason);
    setSubmitting(false);

    if (res.success) {
      toast.success("Refund request submitted!");
      setIsOpen(false);
      setSelectedItem("");
      setReason("");
      loadData();
    } else {
      toast.error(res.error || "Something went wrong.");
    }
  };

  if (loading) {
    return (
      <div className="w-full text-center py-24 font-sans text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#00a896]" /> Fetching refund entries...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 py-8 font-sans text-xs text-slate-600 antialiased flex gap-6">
      
      {/* CONTENT LIST PANEL */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h1 className="text-base font-bold text-slate-800">Refund Requests</h1>
          <button onClick={() => setIsOpen(true)} className="h-8 px-4 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1 transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Submit a Refund Request
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="text-center p-12 bg-white border border-gray-100 rounded-xs italic text-slate-400">No active refund tickets found.</div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const item = req.order_items;
              // Mengambil entitas objek order dari order_items
              const orderData = item?.orders;

              return (
                <div key={req.id} className="bg-white border border-gray-200/70 rounded-xs p-4 flex items-center justify-between gap-4 shadow-3xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 relative bg-slate-50 border border-gray-100 rounded-xs overflow-hidden shrink-0">
                      <Image src={item?.products?.image_urls?.[0] || "/placeholder.png"} alt="Thum" fill className="object-cover" />
                    </div>
                    <div>
                      {/* 🌟 PERBAIKAN: Menggunakan data order yang diambil secara berantai dari item.orders */}
                      {orderData?.id ? (
                        <Link 
                          href={`/orders/${orderData.id}`} 
                          className="font-bold text-slate-800 hover:text-[#00a896] hover:underline block text-xs"
                        >
                          Order: #{orderData.invoice_number}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-400 block text-xs">
                          Order: #{orderData?.invoice_number || "N/A"}
                        </span>
                      )}
                      <p className="text-slate-500 font-medium mt-0.5">{item?.products?.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 font-semibold">
                    <span className={`px-2 py-0.5 rounded-xs text-[9px] font-bold uppercase tracking-wide ${
                      req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      req.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>{req.status}</span>
                    
                    <span className="text-slate-400 font-medium">{formatDistanceToNow(new Date(req.created_at))} ago</span>
                    
                    <Link href={`/orders/refund-requests/${req.id}`} className="h-7 px-3 border border-gray-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xs inline-flex items-center">Details</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DIALOG SUBMIT REFUND (GAMBAR 2) */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xs max-w-md w-full border border-gray-200 shadow-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Submit a Refund Request</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Product</label>
                <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className="w-full h-9 border border-gray-200 rounded-xs px-2 font-medium bg-white focus:border-[#00a896] outline-none">
                  <option value="">Select a completed product item...</option>
                  {completedItems.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.orders?.invoice_number} - {c.products?.title} (${Number(c.total_price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Why do you want a refund? Explain in detail.</label>
                <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-gray-200 rounded-xs p-2 font-medium focus:border-[#00a896] outline-none resize-none" placeholder="Write message..." />
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={submitting} className="h-9 px-5 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1 cursor-pointer disabled:opacity-50">
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { sendRefundMessageAction } from "../action";

export default function RefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const resolvedParams = React.use(params);
  const ticketId = resolvedParams.id;

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typedMessage, setTypedMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadTicketDetails = async () => {
    try {
      setLoading(true);
      
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Auth Error: ${authError.message}`);
      if (!authData?.user) throw new Error("Session expired. Please log in again.");
      
      const user = authData.user;
      setCurrentUserId(user.id);

      const { data: mainTicket, error: ticketError } = await supabase
        .from("refund_requests")
        .select(`
          id, status, created_at,
          order_items!inner(
            total_price,
            products(title, id),
            vendor:profiles(first_name, last_name)
          )
        `)
        .eq("id", ticketId)
        .maybeSingle();

      if (ticketError) throw new Error(`Database Ticket Error: ${ticketError.message}`);
      if (!mainTicket) throw new Error(`Refund ticket with ID #${ticketId} was not found in database.`);

      const { data: chatLogs, error: chatError } = await supabase
        .from("refund_messages")
        .select(`
          id, message, created_at, sender_id,
          profiles:sender_id(first_name, last_name)
        `)
        .eq("refund_request_id", ticketId)
        .order("created_at", { ascending: true });

      if (chatError) throw new Error(`Database Chat Messages Error: ${chatError.message}`);

      setTicket(mainTicket);
      setMessages(chatLogs || []);
      
    } catch (err: any) {
      console.error("🔴 Detail Refund Crash Log:", err.message);
      toast.error(err.message || "An unexpected database runtime error occurred.");
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  // 1. Jalankan fetch awal data tiket
  useEffect(() => { 
    if (ticketId) loadTicketDetails(); 
  }, [ticketId]);

  // 🌟 2. MENGAKTIFKAN LISTEN SUBSCRIPTION REALTIME DARI SUPABASE
  useEffect(() => {
    if (!ticketId) return;

    // Bikin channel realtime khusus buat room tiket ini
    const channel = supabase
      .channel(`realtime-refund-messages-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT", // Dengerin pas ada baris baru masuk tabel
          schema: "public",
          table: "refund_messages",
          filter: `refund_request_id=eq.${ticketId}`, // Kunci khusus untuk tiket ini aja
        },
        async (payload) => {
          // Karena payload data mentah insertion dari Supabase cuma ngasih sender_id (tanpa profil join),
          // kita tarik nama pengirimnya secara manual dari table profiles biar cepet.
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", payload.new.sender_id)
            .maybeSingle();

          const newMessageWithProfile = {
            ...payload.new,
            profiles: senderProfile || { first_name: "User", last_name: "" }
          };

          // Suntik datanya langsung ke array state messages secara realtime!
          setMessages((prev) => [...prev, newMessageWithProfile]);
        }
      )
      .subscribe();

    // Cleanup subscription pas user keluar dari halaman biar gak memori leak
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    setSending(true);
    // Jalankan action server insert data ke DB
    const res = await sendRefundMessageAction(ticketId, typedMessage);
    setSending(false);

    if (res.success) {
      setTypedMessage("");
      // 💡 Catatan: Kita gak perlu manggil loadTicketDetails() lagi di sini,
      // karena useEffect Supabase Realtime di atas otomatis bakal nangkep data barunya!
    } else {
      toast.error("Failed to transmit text message.");
    }
  };

  if (loading) {
    return (
      <div className="w-full text-center py-24 font-sans text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#00a896]" /> Loading dispute room...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="w-full max-w-[900px] mx-auto px-4 py-12 text-center font-sans text-xs text-slate-400 space-y-3">
        <p className="italic">Ticket Dispute record not found.</p>
        <Link href="/refund-requests" className="text-[#00a896] hover:underline font-bold flex items-center justify-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Refund Requests
        </Link>
      </div>
    );
  }

  const item = ticket.order_items;
  const vendorName = `${item?.vendor?.first_name || "Official"} ${item?.vendor?.last_name || "Store"}`;

  return (
    <div className="w-full max-w-[900px] mx-auto px-4 py-8 font-sans text-xs text-slate-600 antialiased space-y-4">
      
      <div className="flex justify-between items-center">
        <Link href="/refund-requests" className="font-bold text-slate-500 hover:text-[#00a896] inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Refund Requests
        </Link>
      </div>

      {/* BANNER DETAIL ITEM REFUND */}
      <div className="bg-white border border-gray-200 rounded-xs p-5 shadow-3xs space-y-3">
        <h2 className="text-slate-800 font-bold text-xs">
          Product: #{item?.products?.id} - {item?.products?.title}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 font-medium">
          <div><span className="text-slate-400 block mb-0.5">Status</span>
            <span className={`px-2 py-0.5 rounded-xs text-[9px] font-bold uppercase ${
              ticket.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
              ticket.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
              'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>{ticket.status}</span>
          </div>
          <div><span className="text-slate-400 block mb-0.5">Total</span><span className="text-slate-800 font-bold">${Number(item?.total_price || 0).toFixed(2)}</span></div>
          <div><span className="text-slate-400 block mb-0.5">Seller</span><span className="text-slate-800 font-bold text-sky-600">{vendorName}</span></div>
          <div><span className="text-slate-400 block mb-0.5">Last Update</span><span className="text-slate-500 font-semibold">{formatDistanceToNow(new Date(ticket.created_at))} ago</span></div>
          <div><span className="text-slate-400 block mb-0.5">Date</span><span className="text-slate-500 font-semibold">{new Date(ticket.created_at).toISOString().split('T')[0]}</span></div>
        </div>
      </div>

      {/* DISPUTE ROOM TIMELINE MESSAGES */}
      <div className="bg-white border border-gray-200 rounded-xs p-5 shadow-3xs space-y-4">
        
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const senderName = `${msg.profiles?.first_name || "User"} ${msg.profiles?.last_name || ""}`;

            return (
              <div key={msg.id} className={`p-4 border border-slate-100/80 rounded-xs space-y-1.5 ${isMe ? 'bg-teal-50/5' : 'bg-slate-50/40'}`}>
                <div className="flex justify-between font-bold text-slate-800 text-[10px]">
                  <span className={isMe ? 'text-[#00a896]' : 'text-slate-700'}>{senderName}</span>
                  <span className="text-slate-400 font-normal">{formatDistanceToNow(new Date(msg.created_at))} ago</span>
                </div>
                <p className="text-slate-600 font-medium leading-relaxed break-words">{msg.message}</p>
              </div>
            );
          })}
        </div>

        {/* BOX TEXTAREA BALASAN OBROLAN */}
        <form onSubmit={handleSendMessage} className="border-t border-gray-100 pt-4 space-y-3">
          <textarea rows={3} value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)} className="w-full border border-gray-200 rounded-xs p-3 font-medium focus:border-[#00a896] outline-none resize-none" placeholder="Write a message..." />
          <div className="flex justify-end">
            <button type="submit" disabled={sending || !typedMessage.trim()} className="h-8 px-6 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1 cursor-pointer disabled:opacity-50">
              {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { sendRefundMessageAction } from "@/app/(marketplace)/(account)/orders/refund-requests/action";
import { updateRefundStatusAction } from "../action";

export default function VendorRefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const resolvedParams = React.use(params);
  const ticketId = resolvedParams.id;

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typedMessage, setTypedMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadTicketDetails = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return router.push("/login");
      setCurrentUserId(authData.user.id);

      const { data: mainTicket, error: ticketError } = await supabase
        .from("refund_requests")
        .select(`
          id, status, created_at,
          buyer:profiles!refund_requests_user_id_fkey(first_name, last_name),
          order_items!inner(
            total_price,
            vendor_id,
            products(title)
          )
        `)
        .eq("id", ticketId)
        .maybeSingle();

      if (ticketError) throw ticketError;
      if (!mainTicket) { setTicket(null); return; }

      const { data: chatLogs, error: chatError } = await supabase
        .from("refund_messages")
        .select(`
          id, message, created_at, sender_id,
          profiles:sender_id(first_name, last_name)
        `)
        .eq("refund_request_id", ticketId)
        .order("created_at", { ascending: true });

      if (chatError) throw chatError;

      setTicket(mainTicket);
      setMessages(chatLogs || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load chat feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) loadTicketDetails();
  }, [ticketId]);

  // Realtime subscription handler
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`vendor-realtime-room-${ticketId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "refund_messages",
        filter: `refund_request_id=eq.${ticketId}`
      }, async (payload) => {
        const { data: senderProf } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", payload.new.sender_id)
          .maybeSingle();

        setMessages((prev) => [...prev, { ...payload.new, profiles: senderProf || { first_name: "User", last_name: "" } }]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    setSending(true);
    const res = await sendRefundMessageAction(ticketId, typedMessage);
    setSending(false);
    if (res.success) setTypedMessage("");
  };

  // Handler eksekusi tombol konfirmasi keputusan vendor
  const handleProcessDecision = (decision: "approved" | "rejected") => {
    Swal.fire({
      title: decision === "approved" ? "Approve Refund Request?" : "Decline Refund Request?",
      text: decision === "approved" 
        ? "Approving this will acknowledge the buyer's return claims." 
        : "Declining will mark this dispute ticket as rejected.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: decision === "approved" ? "#00a896" : "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: decision === "approved" ? "Yes, Approve!" : "Yes, Decline!",
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      setStatusUpdating(true);
      const res = await updateRefundStatusAction(ticketId, decision);
      setStatusUpdating(false);

      if (res.success) {
        toast.success(`Ticket request successfully ${decision}!`);
        loadTicketDetails();
      } else {
        toast.error(res.error || "Failed to submit state.");
      }
    });
  };

  if (loading) return <div className="p-12 text-center text-slate-400 font-sans text-xs">Loading dispute center...</div>;
  if (!ticket) return <div className="p-12 text-center text-slate-400 font-sans text-xs italic">Record not found.</div>;

  const item = ticket.order_items;
  const buyerFullName = `${ticket.buyer?.first_name || "Official"} ${ticket.buyer?.last_name || "Buyer"}`;

  return (
    <div className="max-w-[1000px] mx-auto p-6 bg-white border border-gray-200 rounded-sm shadow-3xs font-sans text-xs text-slate-600 space-y-5">
      
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <Link href="/dashboard/refund-requests" className="font-bold text-slate-500 hover:text-[#00a896] inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </div>

      {/* STRIP INFO HEADLINE (GAMBAR 2 ATAS) */}
      <div className="bg-slate-50 border border-gray-200/60 rounded-xs p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 font-medium">
        <div><span className="text-slate-400 block mb-0.5">Status</span>
          <span className={`px-2 py-0.5 rounded-xs font-bold uppercase text-[9px] ${ticket.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : ticket.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>{ticket.status}</span>
        </div>
        <div><span className="text-slate-400 block mb-0.5">Total</span><span className="font-bold text-slate-800">${Number(item?.total_price || 0).toFixed(2)}</span></div>
        <div><span className="text-slate-400 block mb-0.5">Buyer</span><span className="font-bold text-sky-600">{buyerFullName}</span></div>
        <div><span className="text-slate-400 block mb-0.5">Last Update</span><span className="text-slate-500 font-semibold">{formatDistanceToNow(new Date(ticket.created_at))} ago</span></div>
        <div><span className="text-slate-400 block mb-0.5">Date</span><span className="text-slate-500 font-semibold">{new Date(ticket.created_at).toISOString().split('T')[0]}</span></div>
      </div>

      {/* CHAT BUBBLE TIMELINE AREA */}
      <div className="space-y-4 max-h-[350px] overflow-y-auto border border-slate-100 rounded-xs p-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const senderLabel = `${msg.profiles?.first_name || "User"} ${msg.profiles?.last_name || ""}`;
          return (
            <div key={msg.id} className={`p-3.5 border border-slate-100 rounded-xs space-y-1 ${isMe ? 'bg-teal-50/5' : 'bg-slate-50/40'}`}>
              <div className="flex justify-between font-bold text-[10px]">
                <span className={isMe ? 'text-[#00a896]' : 'text-slate-700'}>{senderLabel}</span>
                <span className="text-slate-400 font-normal">{formatDistanceToNow(new Date(msg.created_at))} ago</span>
              </div>
              <p className="text-slate-600 font-medium leading-relaxed break-words">{msg.message}</p>
            </div>
          );
        })}
      </div>

      {/* FORM INPUT REPLY CHAT */}
      <form onSubmit={handleSendMessage} className="space-y-3">
        <textarea rows={3} value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)} className="w-full border border-gray-200 rounded-xs p-3 font-medium focus:border-[#00a896] outline-none resize-none" placeholder="Message..." />
        <div className="flex justify-end">
          <button type="submit" disabled={sending || !typedMessage.trim()} className="h-8 px-6 bg-[#00a896] text-white font-bold rounded-xs cursor-pointer hover:bg-[#009282] disabled:opacity-50">Submit</button>
        </div>
      </form>

      {/* DUA TOMBOL UTAMA AKSI KEPUTUSAN VENDOR (APROVE / DECLINE) */}
      {ticket.status === "processing" && (
        <div className="flex justify-center items-center gap-3 pt-4 border-t border-gray-100">
          <button 
            type="button"
            disabled={statusUpdating}
            onClick={() => handleProcessDecision("approved")}
            className="h-9 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" /> Approve Refund
          </button>
          
          <button 
            type="button"
            disabled={statusUpdating}
            onClick={() => handleProcessDecision("rejected")}
            className="h-9 px-5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" /> Decline
          </button>
        </div>
      )}

    </div>
  );
}
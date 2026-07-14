"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import toast from "react-hot-toast";

interface AskQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  currentUserId: string | null;
}

export default function AskQuestionModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  sellerId,
  sellerName,
  sellerEmail,
  currentUserId,
}: AskQuestionModalProps) {
  const [messageText, setMessageText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim()) {
      toast.error("Please write a message before sending.");
      return;
    }
    if (!currentUserId) {
      toast.error("You must log in to send a message!");
      return;
    }
    if (currentUserId === sellerId) {
      toast.error("You cannot ask questions about your own product.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // 1. Cari atau buat chat room antara pembeli (currentUserId) dan penjual (sellerId)
      // Asumsi nama tabel room chat lu: chat_rooms
      let roomId: string | null = null;

      const { data: existingRoom, error: roomFetchError } = await supabase
        .from("chat_rooms")
        .select("id")
        .or(`and(buyer_id.eq.${currentUserId},vendor_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},vendor_id.eq.${currentUserId})`)
        .maybeSingle();

      if (roomFetchError) throw roomFetchError;

      if (existingRoom) {
        roomId = existingRoom.id;
      } else {
        // Buat room baru kalau belum pernah chat-chatan
        const { data: newRoom, error: roomInsertError } = await supabase
          .from("chat_rooms")
          .insert({ buyer_id: currentUserId, vendor_id: sellerId })
          .select("id")
          .single();

        if (roomInsertError) throw roomInsertError;
        roomId = newRoom.id;
      }

      // 2. Insert data pesan ke public.chat_messages dengan menyertakan product_id
      const { error: msgError } = await supabase
        .from("chat_messages")
        .insert({
          room_id: roomId,
          sender_id: currentUserId,
          message_text: messageText.trim(),
          product_id: productId, // 🌟 Di-save ke database untuk relasi tautan produk
          is_read: false
        });

      if (msgError) throw msgError;

      toast.success("Message sent successfully!");
      setMessageText("");
      onClose();
    } catch (err) {
      console.error("Chat drop failure:", err);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans animate-fade-in">
      <div className="bg-white rounded-xs border border-gray-200 max-w-[550px] w-full p-6 relative shadow-xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close button cross */}
        <button 
          type="button" 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-medium text-lg cursor-pointer"
        >
          &times;
        </button>

        {/* Modal Header */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6 pt-1">
          Send Message
        </h2>

        {/* Seller Info Segment */}
        <div className="flex gap-4 items-center bg-slate-50/50 p-3 border border-gray-100 rounded-xs mb-4">
          <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm uppercase shadow-xs shrink-0">
            {sellerName.substring(0, 1)}
          </div>
          <div className="text-xs space-y-0.5">
            <span className="block font-bold text-slate-800 text-sm capitalize">{sellerName}</span>
            {sellerEmail && <p className="text-slate-400 font-medium">✉ {sellerEmail}</p>}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
              Subject
            </label>
            <input
              type="text"
              value={productTitle}
              disabled
              className="w-full border border-gray-200 rounded-sm px-3 h-9 text-xs bg-slate-50/50 text-slate-500 font-semibold outline-none cursor-not-allowed shadow-3xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
              Message
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Write a message..."
              className="w-full h-28 border border-gray-200 rounded-sm p-3 text-xs outline-none focus:border-[#00a896] bg-white text-slate-700 shadow-3xs resize-none placeholder-gray-400"
            />
          </div>

          {/* Action buttons footer */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !messageText.trim()}
              className="px-5 h-9 bg-[#00a896] hover:bg-[#009282] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
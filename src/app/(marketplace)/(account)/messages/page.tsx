"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShoppingBag, Send, User, Search } from "lucide-react";
import Link from "next/link";

interface ChatRoom {
  id: string;
  vendor: { id: string; first_name: string; last_name: string; avatar_url: string | null };
  buyer: { id: string; first_name: string; last_name: string; avatar_url: string | null };
}

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  products?: {
    id: number;
    title: string;
    slug: string;
    price: number;
  } | null;
}

// 🌟 Struktur state profil user lokal
interface MyProfile {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export default function MessagesPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null); // 🌟 STATE PROFIL SENDIRI
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Ambil Identitas User & Profil dari Database
  useEffect(() => {
    const getUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        
        // 🔥 KONEKSI AVATAR UTAMA: Ambil data profiles asli user saat ini
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (prof) setMyProfile(prof);
        
        fetchChatRooms(session.user.id);
      }
    };
    getUserAndProfile();
  }, []);

  // 2. Fetch Daftar Obrolan (Inbox)
  const fetchChatRooms = async (userId: string) => {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select(`
        id,
        vendor:vendor_id(id, first_name, last_name, avatar_url),
        buyer:buyer_id(id, first_name, last_name, avatar_url)
      `)
      .or(`buyer_id.eq.${userId},vendor_id.eq.${userId}`);

    if (!error && data) {
      setRooms(data as unknown as ChatRoom[]);
    }
  };

  // 3. Fetch Seluruh Pesan di Room yang Sedang Aktif
  useEffect(() => {
    if (!activeRoom) return;

    const fetchMessages = async () => {
  const { data, error } = await supabase
    .from("chat_messages")
    .select(`
      id,
      room_id,
      sender_id,
      message_text,
      created_at,
      is_read,
      products:product_id (
        id,
        title,
        slug,
        price
      )
    `)
    .eq("room_id", activeRoom.id)
    .order("created_at", { ascending: true });


  if (!error && data) {
    setMessages(data as unknown as Message[]);
  } else if (error) {
    console.error("Gagal Ambil Chat:", error.message);
  }
};

    fetchMessages();

    // REAL-TIME ENGINE
    const channel = supabase
      .channel(`room-${activeRoom.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${activeRoom.id}` },
        async (payload) => {
          if (payload.new.product_id) {
            const { data: prod } = await supabase
              .from("products")
              .select("id, title, slug, price")
              .eq("id", payload.new.product_id)
              .single();
            
            setMessages((prev) => [...prev, { ...payload.new, products: prod } as Message]);
          } else {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom]);

  // Auto scroll ke bawah
  // 🌟 FIX SCROLL: Mengunci pergerakan scroll hanya di dalam area box chat saja
useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ 
      behavior: "smooth", 
      block: "nearest" // 🌟 Kuncinya di sini, biar window/halaman luar gak ikut terseret ke footer
    });
  }
}, [messages]);

  // 4. Kirim Chat Biasa
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom || !currentUser) return;

    const { error } = await supabase.from("chat_messages").insert({
      room_id: activeRoom.id,
      sender_id: currentUser.id,
      message_text: newMessage.trim(),
      product_id: null
    });

    if (!error) setNewMessage("");
  };

  // FILTER ROOM CHAT BERDASARKAN NAMA LAWAN BICARA
  const filteredRooms = rooms.filter((room) => {
    const chatPartner = room.buyer.id === currentUser?.id ? room.vendor : room.buyer;
    const fullName = `${chatPartner.first_name} ${chatPartner.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 font-sans">
      <div className="w-full h-[650px] bg-white border border-gray-200 rounded-sm shadow-xs flex overflow-hidden">
        
        {/* PANEL KIRI: DAFTAR INBOX & SEARCH BAR */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50/50 shrink-0">
          
          {/* 🔥 FIX AKURASI UTAMA: Panel Info Akun Sendiri Terhubung Database */}
          {currentUser && myProfile && (
            <div className="p-4 flex items-center gap-3 border-b border-gray-100 bg-white">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 relative shrink-0 shadow-2xs">
                {myProfile.avatar_url ? (
                  <img src={myProfile.avatar_url} alt="My Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-gray-400 font-bold text-xs uppercase">
                    {myProfile.first_name.substring(0, 2)}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-gray-800 truncate capitalize">
                  {myProfile.first_name} {myProfile.last_name}
                </h4>
                <p className="text-[11px] text-gray-400 font-medium">Online Status</p>
              </div>
            </div>
          )}

          {/* SEARCH BOX MODESY */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="w-full relative flex items-center bg-white border border-gray-200 rounded-md px-3 py-1.5 focus-within:border-[#00a896] transition-all">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs text-gray-700 bg-transparent placeholder:text-gray-400 focus:outline-none pr-6"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 pointer-events-none" />
            </div>
          </div>

          <div className="p-3 pl-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/70 border-b border-gray-100">
            Recent Chats
          </div>

          {/* Render List Room Obrolan yang Terfilter */}
          <div className="flex-1 overflow-y-auto bg-white">
            {filteredRooms.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400 italic">
                No conversations found.
              </div>
            ) : (
              filteredRooms.map((room) => {
                const chatPartner = room.buyer.id === currentUser?.id ? room.vendor : room.buyer;
                return (
                  <div
                    key={room.id}
                    onClick={() => setActiveRoom(room)}
                    className={`p-4 flex items-center gap-3 cursor-pointer border-b border-gray-100 transition-colors ${activeRoom?.id === room.id ? "bg-gray-50/50 border-l-4 border-l-[#00a896]" : "hover:bg-gray-50"}`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shrink-0 shadow-3xs">
                      {chatPartner.avatar_url ? (
                        <img src={chatPartner.avatar_url} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-slate-50 font-bold uppercase text-[11px]">
                          {chatPartner.first_name.substring(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-gray-800 truncate capitalize">
                        {chatPartner.first_name} {chatPartner.last_name}
                      </h4>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">Click to open conversation</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL KANAN: AREA CHAT UTAMA */}
        <div className="flex-1 flex flex-col bg-white">
          {activeRoom ? (
            <>
              {/* Header Lawan Bicara */}
              <div className="p-4 border-b border-gray-200 flex items-center gap-3 bg-gray-50/30">
                <h3 className="font-bold text-gray-800 text-sm capitalize">
                  {activeRoom.buyer.id === currentUser?.id 
                    ? `${activeRoom.vendor.first_name} ${activeRoom.vendor.last_name}` 
                    : `${activeRoom.buyer.first_name} ${activeRoom.buyer.last_name}`}
                </h3>
              </div>

              {/* Area Tumpukan Bubble Chat */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#fdfdfd]">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-sm p-3 shadow-2xs text-[13px] leading-relaxed ${isMe ? "bg-[#00a896] text-white" : "bg-gray-100 text-gray-800"}`}>
                        
                        {/* KOTAK PRODUK JIKA LAMPIRAN ADA */}
                        {msg.products && (
                          <Link 
                            href={`/product/${msg.products.slug}`}
                            className={`mb-2 px-2.5 py-1.5 rounded-xs flex items-center gap-2 border text-xs font-semibold transition-colors cursor-pointer block ${isMe ? "bg-teal-700/40 border-teal-600/30 text-white hover:bg-teal-700/60" : "bg-white border-gray-200 text-gray-700 hover:text-[#00a896]"}`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5 shrink-0 inline mr-1" />
                            <span className="truncate">{msg.products.title}</span>
                          </Link>
                        )}

                        <div>{msg.message_text}</div>
                        
                        <div className={`text-[9px] mt-1 text-right block ${isMe ? "text-teal-200" : "text-gray-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form Ketik Chat */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex gap-3 bg-white">
                <input
                  type="text"
                  placeholder="Write a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-slate-100 border-none rounded-sm px-4 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#00a896]"
                />
                <button type="submit" className="bg-[#00a896] hover:bg-[#009282] text-white p-2.5 rounded-sm transition-colors cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <p className="text-sm">Pilih salah satu obrolan untuk memulai percakapan.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
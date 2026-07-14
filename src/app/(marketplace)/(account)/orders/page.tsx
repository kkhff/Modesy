"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Info } from "lucide-react";
import Link from "next/link";

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  products: {
    title: string;
  };
}

interface Order {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
  order_items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from("orders")
          .select(`
            id,
            invoice_number,
            total_amount,
            status,
            created_at,
            order_items (
              id, quantity, price,
              products (title)
            )
          `)
          .eq("buyer_id", session.user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setOrders(data as any);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Format Status Badge agar pas dengan style Modesy di gambar
  const renderStatus = (status: Order["status"]) => {
    if (status === "pending") {
      return <span className="px-2 py-1 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-xs border border-slate-200">Pending Payment</span>;
    }
    if (status === "processing") {
      return <span className="px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-600 rounded-xs border border-blue-100">Processing</span>;
    }
    if (status === "completed") {
      return <span className="px-2 py-1 text-[10px] font-medium bg-emerald-50 text-emerald-600 rounded-xs border border-emerald-100">Completed</span>;
    }
    return <span className="px-2 py-1 text-[10px] font-medium bg-rose-50 text-rose-600 rounded-xs border border-rose-100">Cancelled</span>;
  };

  if (loading) {
    return (
      <div className="w-full text-center py-12 text-slate-400 flex items-center justify-center gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-[#00a896]" /> Loading orders...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="border border-dashed border-slate-200 rounded-sm p-8 text-center bg-slate-50/20 text-xs">
        <p className="text-slate-400 italic">You don't have any orders yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 font-sans text-xs antialiased text-slate-600">
      {orders.map((order) => {
        // Format tanggal & waktu: YYYY-MM-DD / HH:MM
        const dateObj = new Date(order.created_at);
        const formattedDate = dateObj.toISOString().split('T')[0];
        const formattedTime = dateObj.toTimeString().split(' ')[0].substring(0, 5);

        return (
          <div 
            key={order.id} 
            className="w-full bg-white border border-slate-200 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-3xs transition-shadow"
          >
            {/* Bagian Kiri: Nomor Invoice & Detail Singkat */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Order:</span>
                <strong className="text-slate-800 font-semibold">#{order.invoice_number}</strong>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs truncate">
                {order.order_items.map(item => item.products?.title).join(", ")}
              </p>
            </div>

            {/* Bagian Tengah-Kanan: Info Harga, Status, & Waktu */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-500">
              <div>
                <span className="text-slate-400 mr-1">Total:</span>
                <strong className="text-slate-800 font-bold">${Number(order.total_amount).toFixed(2)}</strong>
              </div>

              {/* Status Transaksi */}
              <div className="min-w-[90px]">
                {renderStatus(order.status)}
              </div>

              {/* Waktu Pembuatan */}
              <div className="text-slate-400 text-[11px] flex items-center gap-1">
                <span>{formattedDate} / {formattedTime}</span>
              </div>

              {/* Tombol Aksi Details */}
              <Link 
                href={`/orders/${order.id}`}
                className="h-7 px-3 bg-[#f4f5f7] hover:bg-slate-200 text-slate-700 font-medium rounded-xs flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer text-[11px]"
              >
                <Info className="size-3 text-slate-500" /> Details
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
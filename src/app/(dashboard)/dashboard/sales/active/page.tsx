"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Info } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function ActiveSalesPage() {
  const supabase = createClient();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const loadActiveSales = async () => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user) return;

      // 🌟 Kueri memuat item orders yang berstatus 'processing' milik produk vendor aktif
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          total_price,
          created_at,
          vendor_id,
          orders!inner(
            id,
            invoice_number,
            status,
            payment_status -- Pastikan kolom ini ada untuk status tagihan (Pending / Received)
          ),
          products(title)
        `)
        .eq("vendor_id", authData.user.id)
        .eq("orders.status", "processing") // 🔒 Hanya status pesanan yang sedang diproses
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err: any) {
      console.error("🔴 Load Active Sales Error:", err.message);
      toast.error(err.message || "Failed to load active sales data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveSales();
  }, []);

  // Filter client-side untuk pencarian Sale ID (invoice) & Payment Status
  const filteredSales = sales.filter((sale) => {
    const invoice = sale.orders?.invoice_number || "";
    const matchesSearch = invoice.toLowerCase().includes(searchId.toLowerCase());
    
    // Asumsi nilai payment_status di DB: 'pending' atau 'completed' / 'received'
    const payStatus = (sale.orders?.payment_status || "").toLowerCase();
    const matchesPayment = 
      paymentFilter === "all" ||
      (paymentFilter === "pending" && payStatus.includes("pending")) ||
      (paymentFilter === "received" && (payStatus.includes("received") || payStatus.includes("completed")));

    return matchesSearch && matchesPayment;
  });

  if (loading) {
    return (
      <div className="w-full text-center py-24 font-sans text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#00a896]" /> Loading active sales...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-sm shadow-3xs font-sans text-xs text-slate-600 antialiased space-y-4">
      
      <div className="border-b border-gray-100 pb-3">
        <h1 className="text-base font-bold text-slate-800">Sales</h1>
      </div>

      {/* BAR FILTER & SEARCH (PERSIS SAMA DENGAN GAMBAR) */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 p-3 rounded-xs border border-gray-100">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-700">Payment Status</span>
          <select 
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-8 min-w-[120px] bg-white border border-gray-200 rounded-xs px-2 outline-none focus:border-[#00a896]"
          >
            <option value="all">All</option>
            <option value="pending">Pending Payment</option>
            <option value="received">Payment Received</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-700">Search</span>
          <input 
            type="text"
            placeholder="Sale Id"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="h-8 border border-gray-200 rounded-xs px-2 outline-none focus:border-[#00a896] placeholder:text-gray-300"
          />
        </div>

        <button 
          onClick={loadActiveSales}
          className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xs self-end cursor-pointer transition-colors"
        >
          Filter
        </button>
      </div>

      {/* DATA TABLE AREA */}
      <div className="overflow-x-auto pt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 font-bold text-slate-400 h-9">
              <th className="py-2">Sale</th>
              <th className="py-2">Total</th>
              <th className="py-2">Payment Status</th>
              <th className="py-2">Status</th>
              <th className="py-2">Date</th>
              <th className="py-2 text-right">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400 italic bg-white">
                  No processing sales found.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                const dateObj = new Date(sale.created_at);
                const formattedDate = dateObj.toISOString().split('T')[0];
                const formattedTime = dateObj.toTimeString().split(' ')[0].substring(0, 5);
                
                // Format display text status bayar
                const displayPaymentStatus = 
                  sale.orders?.payment_status === "completed" || sale.orders?.payment_status === "received"
                    ? "Payment Received"
                    : "Pending Payment";

                return (
                  <tr key={sale.id} className="hover:bg-slate-50/40 h-11">
                    <td className="py-2 text-slate-800 font-bold">
                      #{sale.orders?.invoice_number}
                    </td>
                    <td className="py-2 font-bold text-slate-800">${Number(sale.total_price || 0).toFixed(2)}</td>
                    <td className="py-2 text-slate-500">{displayPaymentStatus}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded-xs text-[9px] font-bold bg-[#00a896] text-white uppercase tracking-wide">
                        {sale.orders?.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-400 font-normal">
                      {formattedDate} / {formattedTime}
                    </td>
                    <td className="py-2 text-right">
                      <Link 
                        href={`/dashboard/sales/${sale.orders?.id}`} 
                        className="h-7 px-3 bg-[#f4f5f7] border border-gray-200 hover:bg-slate-200 text-slate-700 font-bold rounded-xs inline-flex items-center gap-1 transition-colors text-[10px]"
                      >
                        <Info className="w-3 h-3" /> Details
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
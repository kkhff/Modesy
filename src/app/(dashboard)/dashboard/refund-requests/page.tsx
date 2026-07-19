"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

export default function VendorRefundRequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVendorRefunds = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        // 🌟 Kueri filter menggunakan !inner join untuk mengunci vendor_id milik user login
        const { data, error } = await supabase
  .from("refund_requests")
  .select(`
    id, 
    status, 
    created_at,
    user_id,
    buyer:profiles(first_name, last_name),
    order_items!inner(
      total_price,
      vendor_id,
      products(title)
    )
  `)
  .eq("order_items.vendor_id", authData.user.id)
  .order("created_at", { ascending: false });

        if (error) throw error;
        setRequests(data || []);
      } catch (err: any) {
        toast.error(err.message || "Failed to load requests.");
      } finally {
        setLoading(false);
      }
    };

    loadVendorRefunds();
  }, []);

  if (loading) {
    return (
      <div className="w-full text-center py-20 text-slate-400 flex items-center justify-center gap-2 text-xs font-sans">
        <Loader2 className="w-4 h-4 animate-spin text-[#00a896]" /> Loading dashboard data...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-sm shadow-3xs font-sans text-xs text-slate-600">
      <div className="border-b border-gray-100 pb-3 mb-4">
        <h1 className="text-base font-bold text-slate-800">Refund Requests</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 font-bold text-slate-400 h-9">
              <th className="py-2">Product</th>
              <th className="py-2">Total</th>
              <th className="py-2">Buyer</th>
              <th className="py-2">Status</th>
              <th className="py-2">Date</th>
              <th className="py-2 text-right">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
            {requests.map((req) => {
              const item = req.order_items;
              const buyerName = req.buyer ? `${req.buyer.first_name} ${req.buyer.last_name || ""}` : "Buyer";

              return (
                <tr key={req.id} className="hover:bg-slate-50/50 h-11">
                  <td className="py-2 text-slate-600 font-bold max-w-xs truncate">
                    #{req.id} - {item?.products?.title}
                  </td>
                  <td className="py-2 font-bold text-slate-800">${Number(item?.total_price || 0).toFixed(2)}</td>
                  <td className="py-2 text-slate-600 font-bold">{buyerName}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-xs text-[9px] font-bold uppercase ${
                      req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      req.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>{req.status}</span>
                  </td>
                  <td className="py-2 text-slate-400 font-normal">
                    {new Date(req.created_at).toISOString().split('T')[0]} / {new Date(req.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2 text-right">
                    <Link href={`/dashboard/refund-requests/${req.id}`} className="h-7 px-3 bg-[#f4f5f7] border border-gray-200 hover:bg-slate-200 text-slate-700 font-bold rounded-xs inline-flex items-center gap-1">
                      Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pt-4 text-slate-400 font-medium">Number of Entries: {requests.length}</div>
    </div>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import { Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import NewPayoutModal from "@/components/modals/NewPayoutModal";

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Data State
  const [payouts, setPayouts] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  const supabase = createClient();

  // Fungsi fetch gabungan data saldo dan log penarikan dana
  const fetchPayoutData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Ambil data saldo dompet asli pembeli
      const { data: walletData } = await supabase
        .from("user_wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletData) {
        setWalletBalance(Number(walletData.balance) || 0);

        // Calculate Range Indeks Pagination
        const fromIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const toIndex = fromIndex + ITEMS_PER_PAGE - 1;

        // 2. Tarik data riwayat penarikan dari tabel wallet_payouts
        const { data: payoutsData, count } = await supabase
          .from("wallet_payouts")
          .select("id, payout_method, amount, status, created_at", { count: "exact" })
          .eq("wallet_id", walletData.id)
          .order("created_at", { ascending: false })
          .range(fromIndex, toIndex);

        if (payoutsData) setPayouts(payoutsData);
        
        const totalCount = count || 0;
        setTotalPages(Math.ceil(totalCount / ITEMS_PER_PAGE) || 1);
      }
    } catch (err) {
      console.error("Failed to load payouts history:", err);
      toast.error("Failed to refresh records.");
    } finally {
      setLoading(false);
    }
  };

  // Memicu fetch ulang jika halaman pagination bergeser
  useEffect(() => {
    fetchPayoutData();
  }, [currentPage]);

  if (loading) {
    return (
      <div className="w-full text-center py-20 font-sans text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#00a896]" /> Loading records...
      </div>
    );
  }

  return (
    <div className="w-full font-sans antialiased text-xs text-slate-600 space-y-4">
      
      {/* ATAS: CONTAINER DENGAN BUTTON REQUEST */}
      <div className="bg-white border border-gray-100 rounded-sm p-5 shadow-3xs flex justify-end items-center">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-9 px-4 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
        >
          <Plus className="w-4 h-4" /> New Payout Request
        </button>
      </div>

      {/* TENGAH: RUANG DATA TABEL */}
      <div className="w-full overflow-x-auto border border-gray-100 rounded-sm bg-white">
        <table className="w-full min-w-[750px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 font-bold text-slate-700 h-10 select-none">
              <th className="px-4 py-2">Withdrawal Method</th>
              <th className="px-4 py-2">Withdrawal Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400 font-medium italic">
                  No records found!
                </td>
              </tr>
            ) : (
              payouts.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/40 transition-colors h-14">
                  {/* Metode Withdrawal */}
                  <td className="px-4 py-2 font-bold text-slate-800">
                    {row.payout_method}
                  </td>
                  
                  {/* Jumlah Penarikan */}
                  <td className="px-4 py-2 font-bold text-slate-700">
                    ${Number(row.amount).toFixed(2)}
                  </td>
                  
                  {/* Status dari Admin Modesy */}
                  <td className="px-4 py-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-xs font-bold uppercase text-[9px] tracking-wide inline-block ${
                        row.status === "approved"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : row.status === "rejected"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  
                  {/* Penanggalan Data Request */}
                  <td className="px-4 py-2 text-slate-400 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).replace(/\//g, "-")} / {" "}
                    {new Date(row.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CONTROLLER CONTROLLER PAGINATION */}
      {totalPages > 1 && (
        <div className="w-full flex justify-end items-center gap-1.5 mt-5 select-none">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className={`w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center transition-colors ${
              currentPage <= 1 ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setCurrentPage(pageNumber)}
              className={`w-7 h-7 border text-center font-bold rounded-xs flex items-center justify-center transition-all cursor-pointer ${
                currentPage === pageNumber ? "bg-[#00a896] border-[#00a896] text-white" : "bg-white border-gray-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className={`w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center transition-colors ${
              currentPage >= totalPages ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MODAL TRANSAKSI PENARIKAN BARU */}
      <NewPayoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentBalance={walletBalance}
        onSuccess={fetchPayoutData}
      />
    </div>
  );
}
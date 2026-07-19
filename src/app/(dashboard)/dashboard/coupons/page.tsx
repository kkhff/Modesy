"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Ticket, Layers, Trash2, Edit, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { createClient } from "@/lib/supabase/client";
import { deleteCouponAction } from "./action";

// 🌟 Bagian 1: Komponen Utama yang Berisi Logic & State
function VendorCouponsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // State Management
  const [coupons, setCoupons] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Setup arsitektur pagination data (10 data kupon per halaman)
  const ITEMS_PER_PAGE = 10;
  const currentPage = Number(searchParams.get("page")) || 1;
  const fromIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const toIndex = fromIndex + ITEMS_PER_PAGE - 1;

  // 1. Fetch data kupon real-time di sisi client
  const loadCoupons = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data, count, error } = await supabase
        .from("coupons")
        .select("id, coupon_code, discount_rate, number_of_coupons, used_coupons, expiry_date, created_at", { count: "exact" })
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false })
        .range(fromIndex, toIndex);

      if (error) throw error;

      setCoupons(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Failed to load coupons data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [currentPage]);

  // 2. Fungsi Hapus Disertai Cegatan Swal Fire
  const handleDelete = (couponId: string, couponCode: string) => {
    Swal.fire({
      title: "Delete Coupon?",
      text: `Are you sure you want to delete coupon code "${couponCode.toUpperCase()}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete It!",
      cancelButtonText: "Cancel",
      customClass: { popup: "rounded-sm text-xs font-sans" }
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      setDeletingId(couponId);
      const loadingToast = toast.loading("Deleting coupon...");

      try {
        const res = await deleteCouponAction(couponId);
        toast.dismiss(loadingToast);

        if (res.success) {
          toast.success("Coupon deleted successfully!");
          loadCoupons(); // Re-fetch data tabel otomatis
        } else {
          toast.error(res.error || "Failed to delete coupon.");
        }
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("An unexpected error occurred.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  if (loading) {
    return (
      <div className="w-full text-center py-24 font-sans text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#00a896]" /> Loading coupons repository...
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f7f8f9] min-h-screen font-sans antialiased text-xs text-slate-600 p-6 space-y-4">
      
      {/* ATAS: CONTAINER TOMBOL ADD NEW COUPON */}
      <div className="bg-white border border-gray-200/80 rounded-sm p-4 flex justify-between items-center shadow-3xs">
        <h1 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-[#00a896]" /> Coupons
        </h1>
        <Link
          href="/dashboard/coupons/add-coupon"
          className="h-9 px-4 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1.5 transition-colors text-xs"
        >
          <Plus className="w-4 h-4" /> Add Coupon
        </Link>
      </div>

      {/* TENGAH: RUANG HAMPARAN TABEL DATA KUPON */}
      <div className="bg-white border border-gray-200/80 rounded-sm shadow-3xs overflow-hidden flex flex-col justify-between">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[950px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 font-bold text-slate-700 h-10 select-none">
                <th className="px-4 py-2">Coupon Code</th>
                <th className="px-4 py-2">Discount Rate</th>
                <th className="px-4 py-2">Number of Coupons</th>
                <th className="px-4 py-2">Expiry Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-center">Products</th>
                <th className="px-4 py-2 text-center">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium italic bg-white">
                    No coupons created yet.
                  </td>
                </tr>
              ) : (
                coupons.map((row: any) => {
                  const isExpired = new Date(row.expiry_date) < new Date();
                  const isLimitReached = (row.used_coupons || 0) >= row.number_of_coupons;
                  const isActive = !isExpired && !isLimitReached;

                  return (
                    <tr key={row.id} className="h-14 hover:bg-slate-50/40 transition-colors bg-white">
                      
                      <td className="px-4 py-2 font-bold text-slate-800 uppercase tracking-wide">
                        {row.coupon_code}
                      </td>

                      <td className="px-4 py-2 font-bold text-slate-700">
                        {Number(row.discount_rate)}%
                      </td>

                      <td className="px-4 py-2 font-semibold">
                        {row.number_of_coupons} <span className="text-slate-400 font-medium text-[11px]">(Used: <strong className="text-rose-500">{row.used_coupons || 0}</strong>)</span>
                      </td>

                      <td className="px-4 py-2 text-slate-500 font-semibold whitespace-nowrap">
                        {new Date(row.expiry_date).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit"
                        }).replace(/\//g, "-")} / {" "}
                        {new Date(row.expiry_date).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false
                        })}
                      </td>

                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-xs font-bold uppercase text-[9px] tracking-wide inline-block ${
                          isActive 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-2 text-slate-400 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit"
                        }).replace(/\//g, "-")} / {" "}
                        {new Date(row.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false
                        })}
                      </td>

                      <td className="px-4 py-2 text-center">
                        <Link
                          href={`/dashboard/coupons/select-products/${row.id}`}
                          className="h-6 px-3 bg-[#007bff] hover:bg-[#0069d9] text-white rounded-xs font-bold inline-flex items-center gap-1 text-[10px] transition-colors shadow-2xs"
                        >
                          <Layers className="w-3 h-3" /> Select Products
                        </Link>
                      </td>

                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link 
                            href={`/dashboard/coupons/edit/${row.id}`} 
                            className="w-6 h-6 border border-gray-200 text-slate-500 hover:text-[#00a896] hover:border-[#00a896] bg-white rounded-xs flex items-center justify-center transition-all cursor-pointer shadow-3xs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                          
                          <button 
                            type="button" 
                            disabled={deletingId === row.id}
                            onClick={() => handleDelete(row.id, row.coupon_code)}
                            className="w-6 h-6 border border-gray-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 bg-white rounded-xs flex items-center justify-center transition-all cursor-pointer shadow-3xs disabled:opacity-50"
                          >
                            {deletingId === row.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER TOTAL NUMBER OF ENTRIES */}
        <div className="p-4 border-t border-gray-100 bg-white font-semibold text-slate-500 select-none">
          Number of Entries: <span className="text-slate-800 font-bold">{totalCount}</span>
        </div>
      </div>

      {/* CONTROLLER PAGINATION */}
      {totalPages > 1 && (
        <div className="w-full flex justify-end items-center gap-1.5 mt-2 select-none">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/coupons?page=${currentPage - 1}`)}
            disabled={currentPage <= 1}
            className="w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => router.push(`/dashboard/coupons?page=${p}`)}
              className={`w-7 h-7 border text-center font-bold rounded-xs flex items-center justify-center text-xs cursor-pointer ${
                currentPage === p ? "bg-[#00a896] border-[#00a896] text-white" : "bg-white border-gray-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => router.push(`/dashboard/coupons?page=${currentPage + 1}`)}
            disabled={currentPage >= totalPages}
            className="w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}

// 🌟 Bagian 2: Default Export yang Membungkus Konten Utama dengan Suspense Bawaan React
export default function VendorCouponsPage() {
  return (
    <Suspense fallback={
      <div className="w-full text-center py-24 font-sans text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#00a896]" /> Loading coupons repository...
      </div>
    }>
      <VendorCouponsContent />
    </Suspense>
  );
}
import React from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

async function getReferralData(searchParams: { page?: string }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");

  // Setup Pagination (10 data per halaman)
  const ITEMS_PER_PAGE = 10;
  const currentPage = Number(searchParams.page) || 1;
  const fromIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const toIndex = fromIndex + ITEMS_PER_PAGE - 1;

  // Ambil data komisi milik user saat ini yang terikat lewat tabel product_affiliates
  const { data: earnings, count } = await supabase
    .from("affiliate_earnings")
    .select(`
      id,
      commission_amount,
      created_at,
      payout_status,
      product_affiliates!inner(
        user_id,
        products(
          title,
          affiliate_commission_rate
        )
      )
    `, { count: "exact" })
    .eq("product_affiliates.user_id", session.user.id)
    .order("created_at", { ascending: false })
    .range(fromIndex, toIndex);

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  return {
    earnings: earnings || [],
    totalPages,
    currentPage
  };
}

export default async function ReferralEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const { earnings, totalPages, currentPage } = await getReferralData(resolvedParams);

  return (
    <div className="w-full font-sans antialiased text-xs text-slate-600">
      
      {/* TABLE WORKSPACE */}
      <div className="w-full overflow-x-auto border border-gray-100 rounded-sm">
        <table className="w-full min-w-[700px] bg-white text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 font-bold text-slate-700 h-10 select-none">
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Commission Rate</th>
              <th className="px-4 py-2">Earned Amount</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
            {earnings.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400 italic bg-white">
                  You haven't earned any referral commissions yet.
                </td>
              </tr>
            ) : (
              earnings.map((row: any) => {
                const productInfo = row.product_affiliates?.products;
                const rate = productInfo?.affiliate_commission_rate || 0;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/40 transition-colors h-14">
                    {/* Nama Produk */}
                    <td className="px-4 py-2 font-bold text-slate-800 max-w-[300px] truncate">
                      {productInfo?.title || "Unknown Product"}
                    </td>
                    
                    {/* Persentase Settingan Toko */}
                    <td className="px-4 py-2 text-slate-700">{rate}%</td>
                    
                    {/* Uang Bersih Makelar */}
                    <td className="px-4 py-2 font-bold text-emerald-600">
                      ${Number(row.commission_amount).toFixed(2)} (USD)
                    </td>
                    
                    {/* Waktu Masuk Transaksi */}
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CONTROLLER PAGINATION */}
      {totalPages > 1 && (
        <div className="w-full flex justify-end items-center gap-1.5 mt-5 select-none">
          <Link
            href={`/wallet/referral-earnings?page=${currentPage - 1}`}
            className={`w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center transition-colors ${
              currentPage <= 1 ? "pointer-events-none bg-slate-50 text-slate-300" : "bg-white hover:bg-slate-50 text-slate-600"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/wallet/referral-earnings?page=${pageNumber}`}
              className={`w-7 h-7 border text-center font-bold rounded-xs flex items-center justify-center transition-all ${
                currentPage === pageNumber ? "bg-[#00a896] border-[#00a896] text-white" : "bg-white border-gray-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </Link>
          ))}

          <Link
            href={`/wallet/referral-earnings?page=${currentPage + 1}`}
            className={`w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center transition-colors ${
              currentPage >= totalPages ? "pointer-events-none bg-slate-50 text-slate-300" : "bg-white hover:bg-slate-50 text-slate-600"
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

    </div>
  );
}
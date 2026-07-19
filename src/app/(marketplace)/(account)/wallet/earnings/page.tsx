import React from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

async function getEarningsData(searchParams: { page?: string }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");

  // 1. Dapatkan wallet_id vendor saat ini
  const { data: wallet } = await supabase
    .from("user_wallets")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!wallet) {
    return { transactions: [], totalPages: 1, currentPage: 1 };
  }

  // 2. Setup Pagination (10 item per halaman)
  const ITEMS_PER_PAGE = 10;
  const currentPage = Number(searchParams.page) || 1;
  const fromIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const toIndex = fromIndex + ITEMS_PER_PAGE - 1;

  // 3. Ambil data dengan range pagination dan hitung total baris data (count)
  const { data: transactions, count } = await supabase
    .from("wallet_transactions")
    .select("*", { count: "exact" })
    .eq("wallet_id", wallet.id)
    .eq("type", "earnings")
    .order("created_at", { ascending: false })
    .range(fromIndex, toIndex);

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  return {
    transactions: transactions || [],
    totalPages,
    currentPage
  };
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const { transactions, totalPages, currentPage } = await getEarningsData(resolvedParams);

  return (
    <div className="w-full font-sans antialiased text-xs text-slate-600">
      
      {/* WRAPPER TABEL RESPONSIV */}
      <div className="w-full overflow-x-auto border border-gray-100 rounded-sm">
        <table className="w-full min-w-[800px] bg-white text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 font-bold text-slate-700 h-10 select-none">
              <th className="px-4 py-2 w-28">Order</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2 max-w-[220px]">Commissions & Discounts</th>
              <th className="px-4 py-2">Shipping Cost</th>
              <th className="px-4 py-2">Earned Amount</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 italic bg-white">
                  No earnings transactions recorded yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx: any) => {
                // Kalkulasi simulasi detail komisi dummy mengikuti UI Modesy asli
                const totalAmount = Number(tx.amount);
                const commissionRate = 5; // contoh base 5%
                const commission = (totalAmount * commissionRate) / 100;
                const earnedAmount = totalAmount - commission;

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors h-14">
                    {/* Order Reference */}
                    <td className="px-4 py-2 font-bold text-slate-800">
                      {tx.payment_reference_id ? (
                        tx.payment_reference_id.startsWith("INV-") ? (
                          `#${tx.payment_reference_id.split("-")[1]}`
                        ) : (
                          `#${tx.payment_reference_id.substring(0, 8)}`
                        )
                      ) : (
                        `#TX-${tx.id}`
                      )}
                    </td>
                    
                    {/* Total */}
                    <td className="px-4 py-2">${totalAmount.toFixed(2)} (USD)</td>
                    
                    {/* VAT */}
                    <td className="px-4 py-2 text-slate-400">$0</td>
                    
                    {/* Commissions details */}
                    <td className="px-4 py-2 leading-relaxed max-w-[220px]">
                      <div className="text-rose-500">Commission: ${commission.toFixed(2)} ({commissionRate}%)</div>
                      <div className="text-slate-400 text-[10px]">Referrer Commission: $0 (0%)</div>
                      <div className="text-slate-400 text-[10px]">Referral Discount: $0 (0%)</div>
                      <div className="text-slate-400 text-[10px]">Discount Coupon: $0</div>
                    </td>
                    
                    {/* Shipping cost placeholder */}
                    <td className="px-4 py-2 text-slate-700">$0</td>
                    
                    {/* Earned amount (Ijo bersih di Modesy) */}
                    <td className="px-4 py-2 font-bold text-emerald-600">
                      ${earnedAmount.toFixed(2)} (USD)
                    </td>
                    
                    {/* Date Formatting */}
                    <td className="px-4 py-2 text-slate-400 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                      }).replace(/\//g, "-")} / {" "}
                      {new Date(tx.created_at).toLocaleTimeString("id-ID", {
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

      {/* =========================================================================
          CONTROLLER BUTTONS PAGINATION (OTOMATIS HIDE JIKA CUMA 1 PAGE)
          ========================================================================= */}
      {totalPages > 1 && (
        <div className="w-full flex justify-end items-center gap-1.5 mt-5 select-none">
          {/* Tombol Halaman Sebelumnya */}
          <Link
            href={`/wallet/earnings?page=${currentPage - 1}`}
            className={`w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center transition-colors ${
              currentPage <= 1
                ? "pointer-events-none bg-slate-50 text-slate-300"
                : "bg-white hover:bg-slate-50 text-slate-600"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>

          {/* Loop Tombol Angka Halaman */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/wallet/earnings?page=${pageNumber}`}
              className={`w-7 h-7 border text-center font-bold rounded-xs flex items-center justify-center transition-all ${
                currentPage === pageNumber
                  ? "bg-[#00a896] border-[#00a896] text-white"
                  : "bg-white border-gray-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </Link>
          ))}

          {/* Tombol Halaman Selanjutnya */}
          <Link
            href={`/wallet/earnings?page=${currentPage + 1}`}
            className={`w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center transition-colors ${
              currentPage >= totalPages
                ? "pointer-events-none bg-slate-50 text-slate-300"
                : "bg-white hover:bg-slate-50 text-slate-600"
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

    </div>
  );
}
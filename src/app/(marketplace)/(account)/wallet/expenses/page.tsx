import React from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

async function getExpensesData(searchParams: { page?: string }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  // Proteksi keamanan token server-side
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Ambil data wallet_id milik pembeli
  const { data: wallet } = await supabase
    .from("user_wallets")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!wallet) {
    return { expenses: [], totalPages: 1, currentPage: 1 };
  }

  // Pengaturan arsitektur pagination data (10 data per page)
  const ITEMS_PER_PAGE = 10;
  const currentPage = Number(searchParams.page) || 1;
  const fromIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const toIndex = fromIndex + ITEMS_PER_PAGE - 1;

  // 2. Tarik log mutasi keluar bertipe khusus 'expenses' join dengan nomor invoice
  const { data: expenses, count } = await supabase
    .from("wallet_transactions")
    .select(`
      id,
      amount,
      description,
      payment_reference_id,
      status,
      created_at,
      orders (
        invoice_number
      )
    `, { count: "exact" })
    .eq("wallet_id", wallet.id)
    .eq("type", "expenses")
    .order("created_at", { ascending: false })
    .range(fromIndex, toIndex);

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  return {
    expenses: expenses || [],
    totalPages,
    currentPage
  };
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const { expenses, totalPages, currentPage } = await getExpensesData(resolvedParams);

  return (
    <div className="w-full font-sans antialiased text-xs text-slate-600">
      
      {/* RUANG HAMPARAN TABEL RIWAYAT PENGELUARAN */}
      <div className="w-full overflow-x-auto border border-gray-100 rounded-sm">
        <table className="w-full min-w-[750px] bg-white text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 font-bold text-slate-700 h-10 select-none">
              <th className="px-4 py-2">Payment Id (Invoice)</th>
              <th className="px-4 py-2">Payment Method</th>
              <th className="px-4 py-2">Expense Amount</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400 italic bg-white">
                  No expenditure logs recorded yet.
                </td>
              </tr>
            ) : (
              expenses.map((row: any) => {
                // Tarik nomor invoice asli dari relasi object, atau fallback ke reference string
                const displayInvoice = row.orders?.invoice_number || row.payment_reference_id || `TX-EXP-${row.id}`;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/40 transition-colors h-14">
                    {/* Nomor Nota Invoice Belanja */}
                    <td className="px-4 py-2 font-bold text-slate-800 tracking-wide">
                      {displayInvoice}
                    </td>
                    
                    {/* Metode Pembayaran (Mutasi Wallet Internal) */}
                    <td className="px-4 py-2 text-slate-700 font-semibold">
                      Wallet Balance
                    </td>
                    
                    {/* Total Saldo Terpotong */}
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-rose-600">
                          -${Number(row.amount).toFixed(2)} (USD)
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Successful Purchase</span>
                      </div>
                    </td>
                    
                    {/* Tanggal & Waktu Transaksi Pemotongan */}
                    <td className="px-4 py-2 text-slate-400 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span>
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
                        </span>
                        
                        {/* Tautan kosmetik menuju detail pesanan */}
                        <Link 
                          href={`/orders/${displayInvoice}`}
                          className="text-[#00a896] hover:underline flex items-center gap-0.5 font-bold text-[10px]"
                        >
                          <ShoppingBag className="w-3 h-3" /> View Order Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER CONTROLLER PAGINATION */}
      {totalPages > 1 && (
        <div className="w-full flex justify-end items-center gap-1.5 mt-5 select-none">
          <Link
            href={`/wallet/expenses?page=${currentPage - 1}`}
            className={`w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center transition-colors ${
              currentPage <= 1 ? "pointer-events-none bg-slate-50 text-slate-300" : "bg-white hover:bg-slate-50 text-slate-600"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/wallet/expenses?page=${pageNumber}`}
              className={`w-7 h-7 border text-center font-bold rounded-xs flex items-center justify-center transition-all ${
                currentPage === pageNumber ? "bg-[#00a896] border-[#00a896] text-white" : "bg-white border-gray-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </Link>
          ))}

          <Link
            href={`/wallet/expenses?page=${currentPage + 1}`}
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
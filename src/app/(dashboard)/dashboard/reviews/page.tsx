import React from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

async function getReviewsData(searchParams: { page?: string }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  // Proteksi server-side token authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Setup Pagination Data (10 data ulasan per halaman)
  const ITEMS_PER_PAGE = 10;
  const currentPage = Number(searchParams.page) || 1;
  const fromIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const toIndex = fromIndex + ITEMS_PER_PAGE - 1;

  // Ambil data ulasan (rating & text) yang masuk ke produk milik vendor ini
  const { data: reviews, count } = await supabase
    .from("product_reviews")
    .select(`
      id,
      rating,
      review_text,
      created_at,
      profiles (
        first_name,
        last_name
      ),
      products!inner (
        title,
        user_id
      )
    `, { count: "exact" })
    .eq("products.user_id", user.id) // Filter ketat: Cuma produk milik toko si vendor
    .order("created_at", { ascending: false })
    .range(fromIndex, toIndex);

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  return {
    reviews: reviews || [],
    totalCount,
    totalPages,
    currentPage,
    fromIndex
  };
}

export default async function VendorReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const { reviews, totalCount, totalPages, currentPage, fromIndex } = await getReviewsData(resolvedParams);

  return (
    <div className="w-full bg-[#f7f8f9] min-h-screen font-sans antialiased text-xs text-slate-600 p-6 space-y-4">
      
      {/* BOX CONTAINER TABLE UTAMA */}
      <div className="bg-white border border-gray-200/80 rounded-sm shadow-3xs overflow-hidden flex flex-col justify-between">
        
        {/* HEADER JUDUL */}
        <div className="p-4 border-b border-gray-100 font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <Star className="w-4 h-4 text-slate-400 fill-slate-100" /> Reviews
        </div>

        {/* AREA DATA TABEL HAMPARAN */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 font-bold text-slate-700 h-10 select-none">
                <th className="px-4 py-2 w-16">Id</th>
                <th className="px-4 py-2 w-40">User</th>
                <th className="px-4 py-2">Review</th>
                <th className="px-4 py-2 w-64">Product</th>
                <th className="px-4 py-2 w-44">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium italic bg-white">
                    No reviews found!
                  </td>
                </tr>
              ) : (
                reviews.map((row: any, idx) => {
                  // Gabungkan first_name & last_name sebagai nama tampilan
                  const fullName = `${row.profiles?.first_name || ""} ${row.profiles?.last_name || ""}`.trim();
                  const displayAuthorName = fullName || "Guest User";
                  const currentRating = Number(row.rating || 0);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/40 transition-colors bg-white align-top">
                      
                      {/* Penomoran Index Row */}
                      <td className="px-4 py-3 text-slate-400 font-bold">
                        {fromIndex + idx + 1}
                      </td>

                      {/* Nama Tampilan Pengulas */}
                      <td className="px-4 py-3 text-slate-700 font-bold truncate max-w-[150px]">
                        {displayAuthorName}
                      </td>

                      {/* Bintang Rating & Isi Text Ulasan */}
                      <td className="px-4 py-3 space-y-1.5 max-w-[350px]">
                        {/* Render 5 Bintang Interaktif Khas Modesy */}
                        <div className="flex text-amber-400 gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < currentRating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} 
                            />
                          ))}
                        </div>
                        {/* Text Ulasan Ulasan */}
                        <p className="text-slate-600 break-words leading-relaxed font-medium">
                          {row.review_text}
                        </p>
                      </td>

                      {/* Nama Judul Produk Toko */}
                      <td className="px-4 py-3 text-[#00a896] font-bold truncate max-w-[200px] hover:underline cursor-pointer">
                        {row.products?.title}
                      </td>

                      {/* Penanggalan Waktu Input */}
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
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

        {/* FOOTER TOTAL COUNTER BARIS DATA */}
        <div className="p-4 border-t border-gray-100 bg-white font-semibold text-slate-500 select-none">
          Number of Entries: <span className="text-slate-800 font-bold">{totalCount}</span>
        </div>

      </div>

      {/* CONTROLLER NAVIGATION PAGINATION */}
      {totalPages > 1 && (
        <div className="w-full flex justify-end items-center gap-1.5 mt-2 select-none">
          <Link
            href={`/dashboard/reviews?page=${currentPage - 1}`}
            className={`w-7 h-7 border border-gray-200 rounded-xs flex items-center justify-center transition-colors ${
              currentPage <= 1 ? "pointer-events-none bg-slate-50 text-slate-300" : "bg-white hover:bg-slate-50 text-slate-600"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/dashboard/reviews?page=${pageNumber}`}
              className={`w-7 h-7 border text-center font-bold rounded-xs flex items-center justify-center transition-all ${
                currentPage === pageNumber ? "bg-[#00a896] border-[#00a896] text-white" : "bg-white border-gray-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </Link>
          ))}

          <Link
            href={`/dashboard/reviews?page=${currentPage + 1}`}
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
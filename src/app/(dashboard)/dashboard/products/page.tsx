"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client"; // Sesuaikan path client helper Supabase-mu
import { duplicateProductAction, deleteProductAction } from "./action";
import PromoteModal from "@/components/modals/PromoteModal";
import Swal from "sweetalert2";
import { Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon, Copy } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; type?: string; cat?: string }>;
}

export default function VendorProductsPage({ searchParams }: PageProps) {
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
const [activePromoteId, setActivePromoteId] = useState<number | null>(null);
const [activePromoteTitle, setActivePromoteTitle] = useState("");

  // Unpack state filter dari URL searchParams secara reaktif
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const limit = 10;

  // Resolve searchParams bawaan props Next.js ke state lokal
  useEffect(() => {
    searchParams.then((params) => {
      setCurrentPage(Number(params.page) || 1);
      setSearchQuery(params.q || "");
      setTypeFilter(params.type || "");
      setCatFilter(params.cat || "");
    });
  }, [searchParams]);

  // Fetch data gabungan real-time dari Supabase Client Side
  const fetchProducts = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1. Ambil list semua kategori aktif untuk filter dropdown
    const { data: catData } = await supabase
      .from("categories")
      .select("id, name")
      .eq("status", true);
    if (catData) setDbCategories(catData);

    // 2. Hitung jangkauan query pagination data
    const from = (currentPage - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("products")
      .select(`
        id, title, price, stock, is_promoted, promote_end_date, created_at,
        product_type, listing_type, image_urls, sku, page_views,
        categories(id, name)
      `, { count: "exact" })
      .eq("user_id", session.user.id);

    if (searchQuery) query = query.ilike("title", `%${searchQuery}%`);
    if (typeFilter) query = query.eq("product_type", typeFilter);
    if (catFilter) query = query.eq("category_id", Number(catFilter));

    const { data, error, count: totalCount } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      setProducts(data);
      setCount(totalCount || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchQuery, typeFilter, catFilter]);

  const totalPages = Math.ceil(count / limit);

  // --- HANDLER INLINE: DUPLICATE SWEETALERT2 ---
  const handleDuplicateClick = (id: number) => {
    Swal.fire({
      title: "Duplicate Product?",
      text: "This will clone the product details along with all its variations.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#00a896",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Duplicate!",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: "Cloning...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        startTransition(async () => {
          const res = await duplicateProductAction(id);
          Swal.close();
          if (res.success) {
            Swal.fire({ title: "Duplicated!", text: "Product copied successfully!", icon: "success", timer: 1500, showConfirmButton: false });
            fetchProducts(); // Refresh isi baris tabel otomatis
          } else {
            Swal.fire("Failed!", res.error || "Something went wrong", "error");
          }
        });
      }
    });
  };

  // --- HANDLER INLINE: DELETE SWEETALERT2 ---
  const handleDeleteClick = (id: number) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this! All variations will be deleted too.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        startTransition(async () => {
          const res = await deleteProductAction(id);
          Swal.close();
          if (res.success) {
            Swal.fire({ title: "Deleted!", text: "Product has been removed.", icon: "success", timer: 1500, showConfirmButton: false });
            fetchProducts(); // Refresh isi baris tabel otomatis
          } else {
            Swal.fire("Failed!", res.error || "Something went wrong", "error");
          }
        });
      }
    });
  };

  return (
    <div className={`w-full bg-[#f8fafc] min-h-screen p-4 sm:p-6 font-sans text-xs text-slate-600 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      
      {/* HEADER UTAMA DASHBOARD */}
      <div className="w-full bg-white border border-slate-200 rounded-sm p-4 mb-6 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-800 uppercase tracking-wide">Products</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">You can manage all your products from this panel</p>
        </div>
        <Link 
          href="/dashboard/add-product" 
          className="bg-[#00a896] hover:bg-[#009282] text-white text-xs font-bold px-4 h-9 flex items-center rounded-sm transition-colors shadow-xs shrink-0"
        >
          + Add Product
        </Link>
      </div>

      {/* FILTER PANEL ATAS */}
      <div className="w-full bg-white border border-slate-200 rounded-sm p-4 mb-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full bg-white border border-slate-200 h-9 px-2 rounded-sm text-xs focus:outline-none focus:border-[#00a896] cursor-pointer">
              <option value="">Product Type</option>
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          <div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-full bg-white border border-slate-200 h-9 px-2 rounded-sm text-xs focus:outline-none focus:border-[#00a896] cursor-pointer">
              <option value="">Category</option>
              {dbCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..." 
              className="w-full bg-white border border-slate-200 h-9 pl-3 pr-8 rounded-sm text-xs focus:outline-none focus:border-[#00a896]"
            />
            <div className="absolute right-2.5 top-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
          </div>

          <div>
            <button onClick={fetchProducts} className="w-full bg-[#333333] hover:bg-black text-white text-xs font-bold h-9 rounded-sm transition-colors cursor-pointer">
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* TABEL DATA UTAMA */}
      <div className="w-full bg-white border border-slate-200 rounded-sm shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                <th className="p-3 w-12 text-center">Id</th>
                <th className="p-3">Product</th>
                <th className="p-3 w-28">Product Type</th>
                <th className="p-3 w-36">Category</th>
                <th className="p-3 w-40">Promoted Plan</th>
                <th className="p-3 w-28">Price</th>
                <th className="p-3 w-20">Stock</th>
                <th className="p-3 w-24">Page Views</th>
                <th className="p-3 w-28">Date</th>
                <th className="p-3 w-24 text-center">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center p-12 text-slate-400">Loading data products...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center p-12 text-slate-400">No products found matching your active criteria.</td>
                </tr>
              ) : (
                products.map((p) => {
                  const mainImage = p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null;
                  const isPromoActive = p.is_promoted && p.promote_end_date && new Date(p.promote_end_date) > new Date();

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">{p.id}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 border border-slate-200 bg-slate-50 rounded-xs overflow-hidden flex items-center justify-center shrink-0">
                            {mainImage ? (
                              <img src={mainImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 text-[13px] max-w-xs sm:max-w-md truncate">{p.title}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <span>SKU:</span>
                              <span className="font-mono bg-slate-100 px-1 rounded-xs text-slate-600">{p.sku || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 capitalize">
                        <span className={`px-2 py-0.5 rounded-xs font-bold text-[10px] ${
                          p.product_type === "digital" ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                        }`}>
                          {p.product_type}
                        </span>
                      </td>

                      <td className="p-3 text-slate-500 font-medium">
                        {p.categories ? p.categories.name : <span className="text-slate-300 italic">Uncategorized</span>}
                      </td>

                      <td className="p-3">
                        {isPromoActive ? (
                          <div className="space-y-1">
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-xs font-bold text-[10px] inline-block">✓ PROMOTED</span>
                            <p className="text-[10px] text-slate-400">Ends: {new Date(p.promote_end_date!).toLocaleDateString("en-US")}</p>
                          </div>
                        ) : (
                          <button 
  type="button" 
  onClick={() => {
    setActivePromoteId(p.id);
    setActivePromoteTitle(p.title);
    setIsPromoteOpen(true);
  }}
  className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-xs shadow-2xs transition-colors cursor-pointer uppercase tracking-wider"
>
  ★ Promote
</button>
                        )}
                      </td>

                      <td className="p-3 font-extrabold text-slate-800 text-[13px]">
                        {p.price > 0 ? `$${p.price.toFixed(2)}` : <span className="text-emerald-600 font-bold">Free</span>}
                      </td>

                      <td className="p-3">
                        {p.stock > 0 ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-xs text-slate-700 font-medium">{p.stock}</span>
                        ) : (
                          <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-xs font-bold">0</span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-slate-500">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.page_views || 0}</span>
                        </div>
                      </td>

                      <td className="p-3 text-slate-400 text-[11px] font-medium">
                        {new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>

                      {/* OPTIONS ZONE LANGSUNG INLINE SWAL */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-sm shadow-3xs">
                          <Link href={`/dashboard/products/edit/${p.id}`} title="Edit Listing" className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-white rounded-xs transition-all">
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                          <button type="button" onClick={() => handleDuplicateClick(p.id)} title="Duplicate Product" className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-white rounded-xs transition-all cursor-pointer">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteClick(p.id)} title="Delete Product" className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-xs transition-all cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* FOOTER PAGINATION CONTROL */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs select-none mt-4">
          <p className="text-slate-400">
            Showing Page <strong className="text-slate-600 font-bold">{currentPage}</strong> of <strong className="text-slate-600 font-bold">{totalPages}</strong> ({count} total products)
          </p>
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-sm shadow-3xs">
            <button
              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              className={`p-1.5 text-slate-500 hover:bg-slate-50 rounded-xs flex items-center ${currentPage <= 1 ? "pointer-events-none opacity-30" : "cursor-pointer"}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-xs font-bold rounded-xs transition-all cursor-pointer ${
                    currentPage === pageNum ? "bg-[#00a896] text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              className={`p-1.5 text-slate-500 hover:bg-slate-50 rounded-xs flex items-center ${currentPage >= totalPages ? "pointer-events-none opacity-30" : "cursor-pointer"}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <PromoteModal 
    isOpen={isPromoteOpen}
    onClose={() => {
      setIsPromoteOpen(false);
      setActivePromoteId(null);
      setActivePromoteTitle("");
    }}
    productId={activePromoteId}
    productTitle={activePromoteTitle}
  />

    </div>
  );
}
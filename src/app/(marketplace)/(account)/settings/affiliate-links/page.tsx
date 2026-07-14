"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface AffiliateLinkItem {
  id: number;
  affiliate_code: string;
  created_at: string;
  products: {
    title: string;
  } | null;
}

export default function AffiliateLinksPage() {
  const [links, setLinks] = useState<AffiliateLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const supabase = createClient();

  // 1. Ambil data URL Origin dan fetch data link afiliasi user
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }

    const fetchAffiliateLinks = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("product_affiliates")
          .select(`
            id,
            affiliate_code,
            created_at,
            products (
              title
            )
          `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setLinks(data as unknown as AffiliateLinkItem[]);
      } catch (err) {
        console.error("Error fetching affiliate links:", err);
        toast.error("Failed to load affiliate links.");
      } finally {
        setLoading(false);
      }
    };

    fetchAffiliateLinks();
  }, []);

  // 2. Fungsi hapus link afiliasi dengan validasi Toast English
  const handleDeleteLink = async (id: number) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this affiliate link?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("product_affiliates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Optimistic update agar langsung hilang dari list tabel
      setLinks((prev) => prev.filter((item) => item.id !== id));
      toast.success("Affiliate link deleted successfully.");
    } catch (err) {
      console.error("Failed to delete affiliate link:", err);
      toast.error("Failed to delete link. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white p-6 rounded-xs border border-gray-200 text-center text-xs text-slate-400 font-medium">
        Loading affiliate links...
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xs border border-gray-200 shadow-3xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-slate-800 font-bold bg-gray-50/70">
              <th className="p-4 pl-6 w-1/3">Product</th>
              <th className="p-4 w-1/2">Affiliate Link</th>
              <th className="p-4 pr-6 w-1/6">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
            {links.map((item) => {
              // Menyusun full URL link affiliate target redirect
              const fullAffiliateUrl = `${baseUrl}/products?ref=${item.affiliate_code}`;
              const formattedDate = new Date(item.created_at).toISOString().split("T")[0];

              return (
                <tr key={item.id} className="hover:bg-slate-50/40 transition-colors align-top">
                  {/* Kolom Judul Produk */}
                  <td className="p-4 pl-6 font-semibold text-slate-700 max-w-[240px] break-words whitespace-normal leading-relaxed">
                    {item.products?.title || "Unknown Product"}
                  </td>
                  
                  {/* Kolom Full Link Affiliate */}
                  <td className="p-4 font-mono text-[11px] text-[#00a896] break-all whitespace-normal leading-relaxed">
                    <a 
                      href={fullAffiliateUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline break-all"
                    >
                      {fullAffiliateUrl}
                    </a>
                  </td>
                  
                  {/* Kolom Tanggal Pembuatan & Tombol Aksi Hapus */}
                  <td className="p-4 pr-6 text-slate-400 text-[11px]">
                    <div className="flex flex-col space-y-1">
                      <span>{formattedDate}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteLink(item.id)}
                        className="text-rose-400 hover:text-rose-600 font-bold text-left text-[10px] underline cursor-pointer transition-colors w-fit"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Render Empty Condition jika data kosong */}
            {links.length === 0 && (
              <tr>
                <td colSpan={3} className="p-10 text-center text-slate-400 italic bg-slate-50/10">
                  You haven't generated any affiliate links yet. Go to a product page to create one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Star } from "lucide-react";
import toast from "react-hot-toast";

interface MyReviewItem {
  id: number;
  rating: number;
  review_text: string | null;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  products: {
    title: string;
    slug: string;
  } | null;
}

export default function MyReviewsPage() {
  const { slug } = useParams();
  const [reviews, setReviews] = useState<MyReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchMyReviews = async () => {
      try {
        // 1. Dapatkan profile id berdasarkan slug pemilik halaman profil
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (!profile) {
          setLoading(false);
          return;
        }

        // 2. Ambil ulasan yang ditulis oleh user pemilik halaman ini
        // Relasi profiles di bawah otomatis menunjuk ke user_id (penulis review)
        const { data, error } = await supabase
          .from("product_reviews")
          .select(`
            id,
            rating,
            review_text,
            created_at,
            profiles (
              first_name,
              last_name,
              avatar_url
            ),
            products (
              title,
              slug
            )
          `)
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setReviews(data as unknown as MyReviewItem[]);
      } catch (err) {
        console.error("Error fetching my reviews:", err);
        toast.error("Failed to load your reviews.");
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchMyReviews();
  }, [slug]);

  // Fungsi hapus review secara real-time
  const handleDeleteReview = async (id: number) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this review?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setReviews((prev) => prev.filter((rev) => rev.id !== id));
      toast.success("Review deleted successfully.");
    } catch (err) {
      console.error("Failed to delete review:", err);
      toast.error("Failed to delete review.");
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays < 1) return "Today";
    if (diffInDays < 30) return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  };

  if (loading) {
    return (
      <div className="w-full text-center py-10 text-xs text-slate-400 font-medium bg-white border border-gray-200 rounded-xs">
        Loading reviews...
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xs p-6 shadow-3xs font-sans text-xs text-slate-600">
      
      {/* HEADER COUNT */}
      <h2 className="text-sm font-bold text-slate-800 border-b border-gray-100 pb-4 mb-5">
        My Reviews ({reviews.length})
      </h2>

      {/* RENDER LIST */}
      <div className="space-y-6">
        {reviews.length > 0 ? (
          reviews.map((rev) => {
            if (!rev.products) return null;

            // Nama asli kita sebagai penulis review
            const reviewerName = rev.profiles
              ? `${rev.profiles.first_name || "User"} ${rev.profiles.last_name || ""}`.trim()
              : "Anonymous";

            const reviewerAvatar = rev.profiles?.avatar_url;

            return (
              <div key={rev.id} className="pb-6 border-b border-gray-100 last:border-0 flex gap-4 items-start relative">
                
                {/* Avatar Penulis Review (User) */}
                <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border border-gray-200/60 shrink-0 flex items-center justify-center font-bold text-slate-400 text-xs uppercase shadow-3xs">
                  {reviewerAvatar ? (
                    <img src={reviewerAvatar} alt="My Avatar" className="w-full h-full object-cover" />
                  ) : (
                    reviewerName.substring(0, 2)
                  )}
                </div>

                {/* Konten Ulasan */}
                <div className="space-y-1 flex-1 pr-12">
                  <p className="text-[11px] text-slate-400 font-medium">
                    Product:{" "}
                    <Link 
                      href={`/product/${rev.products.slug}`} 
                      className="text-[#00a896] font-bold hover:underline"
                    >
                      {rev.products.title}
                    </Link>
                  </p>

                  {/* Rating Bintang */}
                  <div className="flex text-amber-400 gap-0.5 pt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${
                          i < rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"
                        }`} 
                      />
                    ))}
                  </div>

                  {/* Nama Penulis Review */}
                  <span className="block font-bold text-slate-800 text-xs capitalize pt-0.5">
                    {reviewerName}
                  </span>

                  {/* Isi Teks Review */}
                  <p className="text-slate-600 text-xs leading-relaxed font-medium pt-0.5 max-w-2xl">
                    {rev.review_text || "No text review details left."}
                  </p>

                  {/* Waktu */}
                  <p className="text-[10px] text-slate-400 pt-1 font-medium">
                    {formatTimeAgo(rev.created_at)}
                  </p>
                </div>

                {/* TOMBOL DELETE DI UJUNG KANAN ATAS */}
                <button
                  type="button"
                  onClick={() => handleDeleteReview(rev.id)}
                  className="absolute top-0 right-0 text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer underline transition-colors"
                >
                  Delete
                </button>

              </div>
            );
          })
        ) : (
          <p className="text-slate-400 text-xs italic py-4">
            You haven't written any product reviews yet.
          </p>
        )}
      </div>

    </div>
  );
}
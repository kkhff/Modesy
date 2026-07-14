import React from "react";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Star } from "lucide-react";

interface ReviewItem {
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

async function getVendorReviews(slug: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 1. Dapatkan profile id penjual berdasarkan slug url
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile) return { reviews: [], totalReviews: 0, avgRating: 0 };

  // 2. Tarik data review yang mereferensikan produk milik vendor ini menggunakan inner join
  const { data: reviews, error } = await supabase
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
      products!inner (
        title,
        slug,
        user_id
      )
    `)
    .eq("products.user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data ulasan toko:", error.message);
    return { reviews: [], totalReviews: 0, avgRating: 0 };
  }

  const totalReviews = reviews?.length || 0;
  const avgRating = totalReviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  return {
    reviews: (reviews as unknown as ReviewItem[]) || [],
    totalReviews,
    avgRating,
  };
}

export default async function VendorReviewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { reviews, totalReviews, avgRating } = await getVendorReviews(slug);

  // Fungsi helper kalkulasi rentang waktu bergaya Modesy
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours < 24) {
      return diffInHours <= 0 ? "Just now" : `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xs p-6 shadow-3xs font-sans text-xs text-slate-600">
      
      {/* HEADER RATING SUMMARY TAB */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-5 mb-5 font-bold">
        <div className="flex text-amber-400 gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className={`w-4 h-4 ${
                i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"
              }`} 
            />
          ))}
        </div>
        <span className="text-slate-800 text-sm">
          Reviews ({totalReviews})
        </span>
      </div>

      {/* LIST ITEM REVIEWS UNAVIGATED */}
      <div className="space-y-6">
        {reviews.length > 0 ? (
          reviews.map((rev) => {
            const reviewerName = rev.profiles
              ? `${rev.profiles.first_name || "User"} ${rev.profiles.last_name || ""}`.trim()
              : "Anonymous";

            return (
              <div key={rev.id} className="pb-6 border-b border-gray-100 last:border-0 flex gap-4 items-start">
                
                {/* Avatar Pengulas */}
                <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border border-gray-200/60 shrink-0 flex items-center justify-center font-bold text-slate-400 text-xs uppercase shadow-3xs">
                  {rev.profiles?.avatar_url ? (
                    <img src={rev.profiles.avatar_url} alt="Reviewer" className="w-full h-full object-cover" />
                  ) : (
                    reviewerName.substring(0, 2)
                  )}
                </div>

                {/* Konten Ulasan */}
                <div className="space-y-1.5 flex-1 relative">
                  
                  {/* Tautan Produk yang Di-review */}
                  {rev.products && (
                    <p className="text-[11px] text-slate-400 font-medium">
                      Product:{" "}
                      <Link 
                        href={`/product/${rev.products.slug}`} 
                        className="text-[#00a896] font-bold hover:underline"
                      >
                        {rev.products.title}
                      </Link>
                    </p>
                  )}

                  {/* Rating Bintang Individu */}
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

                  {/* Nama Pengulas */}
                  <span className="block font-bold text-slate-800 text-xs capitalize pt-0.5">
                    {reviewerName}
                  </span>

                  {/* Teks Deskripsi Ulasan */}
                  <p className="text-slate-600 text-xs leading-relaxed font-medium max-w-2xl pt-0.5">
                    {rev.review_text || "No written review text details provided."}
                  </p>

                  {/* Waktu Pembuatan & Link Report Palsu khas Modesy */}
                  <div className="flex items-center gap-4 pt-1 text-[10px] text-slate-400 font-medium">
                    <span>{formatTimeAgo(rev.created_at)}</span>
                  </div>

                  {/* Label Report Visual di Sisi Kanan Atas */}
                  <span className="absolute top-0 right-0 text-[10px] text-slate-400 font-medium hover:text-rose-500 cursor-pointer underline">
                    Report
                  </span>

                </div>
              </div>
            );
          })
        ) : (
          <p className="text-slate-400 text-xs italic py-4">
            This store hasn't received any reviews yet.
          </p>
        )}
      </div>

    </div>
  );
}
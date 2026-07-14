"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Heart, Star } from "lucide-react";
import toast from "react-hot-toast";

interface WishlistItem {
  id: number;
  product_id: number;
  products: {
    id: number;
    title: string;
    slug: string;
    price: number;
    discount_rate: number;
    discounted_price: number | null;
    image_urls: string[] | null;
    rating: number | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
}

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // 1. Ambil data wishlist berdasarkan user session aktif
  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("wishlists")
          .select(`
            id,
            product_id,
            products (
              id,
              title,
              slug,
              price,
              discount_rate,
              discounted_price,
              image_urls,
              rating,
              profiles (
                first_name,
                last_name
              )
            )
          `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setWishlistItems(data as unknown as WishlistItem[]);
      } catch (err) {
        console.error("Error fetching wishlist:", err);
        toast.error("Failed to load your wishlist.");
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  // 2. Fungsi untuk menghapus item dari wishlist secara optimistic
  const handleRemoveWishlist = async (wishlistId: number) => {
    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", wishlistId);

      if (error) throw error;

      // Update state lokal secara kilat biar item langsung hilang dari grid UI
      setWishlistItems((prev) => prev.filter((item) => item.id !== wishlistId));
      toast.success("Removed from wishlist.");
    } catch (err) {
      console.error("Failed to remove item:", err);
      toast.error("Failed to remove item. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="w-full text-center py-20 font-sans text-xs text-slate-400 font-medium bg-[#f8f9fa]">
        Loading your wishlist...
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen font-sans pb-16">
      <div className="max-w-[1200px] mx-auto px-4">
        
        {/* BREADCRUMB */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 pt-6 font-medium">
          <Link href="/" className="hover:text-[#00a896]">Home</Link>
          <span>/</span>
          <span className="text-slate-600 font-semibold">Wishlist</span>
        </nav>

        {/* PAGE TITLE */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Wishlist</h1>

        {/* GRID LAYOUT PRODUK WISHLIST */}
        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
            {wishlistItems.map((item) => {
              const product = item.products;
              if (!product) return null;

              const price = Number(product.price) || 0;
              const discountedPrice = product.discounted_price !== null ? Number(product.discounted_price) : null;
              const hasDiscount = product.discount_rate > 0 || (discountedPrice !== null && discountedPrice < price);
              const finalPrice = hasDiscount && discountedPrice !== null ? discountedPrice : price;

              const firstImage = product.image_urls && product.image_urls.length > 0 
                ? product.image_urls[0] 
                : "https://placehold.co/400x500?text=No+Image";

              const sellerName = product.profiles?.first_name 
                ? `${product.profiles.first_name} ${product.profiles.last_name || ""}`.trim() 
                : "Official Store";

              return (
                <div 
                  key={item.id} 
                  className="bg-white border border-gray-200 rounded-xs overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative"
                >
                  <div>
                    {/* AREA THUMBNAIL GAMBAR */}
                    <div className="w-full aspect-[4/5] bg-gray-50 relative overflow-hidden">
                      <Link href={`/product/${product.slug}`} className="block w-full h-full cursor-pointer">
                        <img 
                          src={firstImage} 
                          alt={product.title} 
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" 
                        />
                      </Link>

                      {hasDiscount && product.discount_rate > 0 && (
                        <span className="absolute top-3 left-3 bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-xs shadow-xs z-10">
                          -{Math.round(product.discount_rate)}%
                        </span>
                      )}
                    </div>

                    {/* DETAIL DESKRIPSI CARD */}
                    <div className="p-3.5 space-y-1">
                      <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">
                        {sellerName}
                      </span>
                      <Link 
                        href={`/product/${product.slug}`} 
                        className="text-xs font-bold text-gray-800 group-hover:text-[#00a896] transition-colors line-clamp-2 min-h-[32px] leading-snug block cursor-pointer"
                      >
                        {product.title}
                      </Link>
                      
                      {/* BINTANG RATING */}
                      <div className="flex items-center gap-0.5 pt-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${
                              i < (product.rating || 0) 
                                ? "text-amber-400 fill-amber-400" 
                                : "text-gray-200 fill-gray-200"
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM PRICING & HEART ACTION BUTTON */}
                  <div className="p-3.5 pt-0 flex items-end justify-between">
                    <div className="flex items-center gap-2 pt-1.5">
                      <span className="text-sm font-bold text-gray-900">${finalPrice.toFixed(2)}</span>
                      {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">${price.toFixed(2)}</span>
                      )}
                    </div>

                    {/* TOMBOL UNLIKE / REMOVE WISHLIST */}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveWishlist(item.id)}
                      className="text-rose-500 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                      title="Remove from wishlist"
                    >
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY WISHLIST STATE DISPLAY */
          <div className="w-full bg-white border border-gray-200 p-12 rounded-xs text-center shadow-3xs">
            <p className="text-sm text-slate-400 italic">Your wishlist is empty.</p>
            <Link 
              href="/products" 
              className="mt-4 inline-block text-xs font-bold text-white bg-[#00a896] hover:bg-[#009282] px-5 h-9 leading-9 rounded-xs transition-colors"
            >
              Explore Products
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
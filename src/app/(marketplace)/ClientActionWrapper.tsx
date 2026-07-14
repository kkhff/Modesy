"use client";

import React, { useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";

interface WrapperProps {
  productId: number;
  currentUserId: string | null;
  initialWished: boolean;
}

export default function ClientActionWrapper({ productId, currentUserId, initialWished }: WrapperProps) {
  const [isWished, setIsWished] = useState(initialWished);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ACTION: HANDLE INTERAKSI WISHLIST ---
  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Mencegah bubbling navigasi
    if (!currentUserId) {
      toast.error("You must log in to update your wishlist!");
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (isWished) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", currentUserId)
          .eq("product_id", productId);

        if (error) throw error;
        setIsWished(false);
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert({ user_id: currentUserId, product_id: productId });

        if (error) throw error;
        setIsWished(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update wishlist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTION: QUICK ADD TO CART ---
  const handleQuickAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault(); // Mencegah bubbling navigasi
    if (!currentUserId) {
      toast.error("You must log in to add items to the cart!");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // Karena quick-add dari home, variation_id kita set null (default parent product)
      const { error } = await supabase
        .from("carts")
        .insert({
          user_id: currentUserId,
          product_id: productId,
          variation_id: null,
          quantity: 1
        });

      if (error) throw error;
      toast.success("Added to cart successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add product to cart.");
    }
  };

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200 z-10">
      {/* Tombol Wishlist */}
      <button
        type="button"
        onClick={handleWishlistClick}
        className="w-8 h-8 bg-white hover:bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-rose-500 shadow-xs transition-colors cursor-pointer"
        title={isWished ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart className={`w-4 h-4 transition-transform ${isWished ? "fill-rose-500 text-rose-500 scale-105" : "text-gray-500"}`} />
      </button>

      {/* Tombol Quick Add to Cart */}
      <button
        type="button"
        onClick={handleQuickAddToCart}
        className="w-8 h-8 bg-white hover:bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-[#00a896] shadow-xs transition-colors cursor-pointer"
        title="Quick add to cart"
      >
        <ShoppingBag className="w-4 h-4" />
      </button>
    </div>
  );
}
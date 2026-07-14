"use client";

import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import toast from "react-hot-toast";

interface AddReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  currentUserId: string | null;
  existingReview?: { rating: number; review_text: string } | null;
  onSuccess: (newReview: any) => void;
}

export default function AddReviewModal({
  isOpen,
  onClose,
  productId,
  currentUserId,
  existingReview,
  onSuccess
}: AddReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data jika user mengedit ulasan yang sudah ada
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review_text || "");
    } else {
      setRating(0);
      setReviewText("");
    }
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating between 1 and 5 stars.");
      return;
    }
    if (!currentUserId) {
      toast.error("You must log in to rate this product!");
      return;
    }

    setIsSubmitting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      let query;
      
      // Jika user sudah pernah review, lakukan update, jika belum lakukan insert (Upsert logic)
      if (existingReview) {
        query = supabase
          .from("product_reviews")
          .update({ rating, review_text: reviewText.trim() })
          .eq("product_id", productId)
          .eq("user_id", currentUserId)
          .select("*, profiles(first_name, last_name)")
          .single();
      } else {
        query = supabase
          .from("product_reviews")
          .insert({
            product_id: productId,
            user_id: currentUserId,
            rating,
            review_text: reviewText.trim()
          })
          .select("*, profiles(first_name, last_name)")
          .single();
      }

      const { data, error } = await query;
      if (error) throw error;

      toast.success(existingReview ? "Review updated successfully!" : "Review submitted successfully!");
      onSuccess(data);
      onClose();
    } catch (err) {
      console.error("Review operation failed:", err);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans">
      <div className="bg-white rounded-xs border border-gray-200 max-w-[550px] w-full p-6 relative shadow-xl animate-in fade-in zoom-in-95 duration-150">
        
        <button 
          type="button" 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
        >
          &times;
        </button>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-6 pt-2">
          Rate this product
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SELEKTOR BINTANG RATING INTERAKTIF */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 tracking-wide">
              Your Rating:
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const activeStar = hoverRating || rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 cursor-pointer transition-transform active:scale-95"
                  >
                    <Star 
                      className={`w-6 h-6 ${
                        star <= activeStar 
                          ? "text-amber-400 fill-amber-400" 
                          : "text-gray-200 fill-gray-100"
                      }`} 
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* INPUT TEXT AREA */}
          <div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write a Review..."
              className="w-full h-32 border border-gray-200 rounded-sm p-3 text-xs outline-none focus:border-[#00a896] bg-white text-slate-700 shadow-3xs resize-none placeholder-gray-400"
            />
          </div>

          <p className="text-[11px] text-slate-400 italic">
            *If you have already added a review, your review will be updated.
          </p>

          {/* ACCORDION BUTTONS */}
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-9 bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs font-bold rounded-xs cursor-pointer transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="px-6 h-9 bg-[#00a896] hover:bg-[#009282] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xs transition-all shadow-2xs cursor-pointer"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
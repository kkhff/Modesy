"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";

interface ReportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  currentUserId: string | null;
}

export default function ReportProductModal({ 
  isOpen, 
  onClose, 
  productId, 
  currentUserId 
}: ReportProductModalProps) {
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  if (!isOpen) return null;

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportDescription.trim()) {
      toast.error("Please provide a short description of the issue.");
      return;
    }
    if (!currentUserId) {
      toast.error("You must log in to report this product!");
      return;
    }

    setIsSubmittingReport(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase
        .from("product_reports")
        .insert({
          product_id: productId,
          user_id: currentUserId,
          description: reportDescription.trim()
        });

      if (error) throw error;

      toast.success("Product has been reported successfully.");
      setReportDescription("");
      onClose(); // Tutup modal setelah sukses
    } catch (err) {
      console.error("Failed to submit report:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity font-sans">
      <div className="bg-white rounded-xs border border-gray-200 max-w-[550px] w-full p-6 relative shadow-xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Tombol Silang Cancel */}
        <button 
          type="button" 
          onClick={() => {
            onClose();
            setReportDescription("");
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-medium text-lg cursor-pointer"
        >
          &times;
        </button>

        {/* Judul Modal */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6 pt-2">
          Report this product
        </h2>

        {/* Form Input Deskripsi */}
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Briefly describe the issue you're facing"
              className="w-full h-32 border border-gray-200 rounded-sm p-3 text-xs outline-none focus:border-[#00a896] bg-white text-slate-700 shadow-3xs resize-none placeholder-gray-400"
              maxLength={500}
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmittingReport || !reportDescription.trim()}
              className="px-6 h-9 bg-[#00a896] hover:bg-[#009282] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xs transition-all shadow-2xs cursor-pointer flex items-center justify-center"
            >
              {isSubmittingReport ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
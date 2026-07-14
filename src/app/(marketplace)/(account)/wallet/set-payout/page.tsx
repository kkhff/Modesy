"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function SetPayoutPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Ambil data awal email PayPal dari database
  useEffect(() => {
    const loadCurrentPaypal = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        
        const { data, error } = await supabase
          .from("user_wallets")
          .select("paypal_email")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!error && data?.paypal_email) {
          setPaypalEmail(data.paypal_email);
        }
      }
      setFetching(false);
    };

    loadCurrentPaypal();
  }, []);

  // 2. Aksi simpan perubahan ke database
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);

    const { error } = await supabase
      .from("user_wallets")
      .update({ 
        paypal_email: paypalEmail.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    setLoading(false);

    if (error) {
      toast.error("Failed to update payout account: " + error.message);
    } else {
      toast.success("Payout account updated successfully!");
    }
  };

  if (fetching) {
    return <div className="text-center py-8 text-xs text-gray-400">Loading payout settings...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 font-sans">
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Navigasi Tab Metode Internal (Hanya PayPal Sesuai Request) */}
        <div className="flex gap-2 border-b border-gray-100 pb-3">
          <button 
            type="button" 
            className="bg-[#00a896] text-white text-xs font-bold px-4 py-2 rounded-xs shadow-2xs"
          >
            PayPal
          </button>
        </div>

        {/* Input Field Form Modesy Style */}
        <div className="space-y-2 max-w-2xl">
          <label className="block text-xs font-bold text-gray-700 tracking-wide">
            PayPal Email Address*
          </label>
          <input
            type="email"
            required
            placeholder="Enter your registered PayPal email"
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            className="w-full border border-gray-200 bg-white rounded-sm px-3 py-2 text-xs text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-[#00a896] focus:ring-1 focus:ring-[#00a896] transition-all"
          />
        </div>

        {/* Tombol Simpan Aksi */}
        <div className="flex justify-end max-w-2xl">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#00a896] hover:bg-[#009282] text-white font-bold text-xs px-5 py-2.5 rounded-sm transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {loading ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>

      </form>
    </div>
  );
}
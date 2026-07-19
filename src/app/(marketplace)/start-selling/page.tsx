"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Info } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { submitVendorRequestAction } from "./action";

export default function StartSellingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const checkStatusAndProcess = async () => {
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        router.push("/");
        return;
      }

      // 1. Dapatkan role dari tabel profiles
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profErr || !prof) throw new Error("Gagal memuat profil otoritas.");
      setUserRole(prof.role);

      // Jika dia vendor atau admin, langsung redirect paksa ke halaman add-product
      if (prof.role === "vendor" || prof.role === "admin") {
        router.push("/dashboard/add-product");
        return;
      }

      // Jika role-nya moderator, batasi di sini (jangan kirim data request ke DB)
      if (prof.role === "moderator") {
        setLoading(false);
        return;
      }

      // 2. Jika role-nya member, cek status tiket pengajuan lamanya di database
      const { data: reqData } = await supabase
        .from("vendor_requests")
        .select("status")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (reqData) {
        setRequestStatus(reqData.status);
      } else {
        // Jika belum pernah mengajukan, tembak Server Action untuk mendaftar otomatis
        const res = await submitVendorRequestAction();
        if (res.success) {
          setRequestStatus("pending");
        } else {
          toast.error(res.error || "Gagal mengirim permintaan toko.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatusAndProcess();
  }, []);

  if (loading) {
    return (
      <div className="w-full text-center py-32 text-slate-400 font-sans text-xs flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#00a896]" /> Evaluating membership configuration...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 py-16 font-sans text-xs antialiased text-slate-500">
      <div className="text-center max-w-2xl mx-auto space-y-6">
        
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Start Selling</h1>
        <p className="text-slate-400 font-medium leading-relaxed px-6">
          In order to sell your products, you must be a verified member. Verification is a one-time
          process. This verification process is necessary because of spammers and fraud.
        </p>

        {/* 🔴 TAMPILAN JIKA SESEORANG ADALAH MODERATOR (ALERT MERAH / DITOLAK) */}
        {userRole === "moderator" && (
          <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xs flex items-center gap-2 text-left font-medium shadow-3xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <div>
              <span className="font-bold">Access Denied!</span> Account with Moderator privileges cannot register as a vendor or open store listings.
            </div>
          </div>
        )}

        {/* 🌐 TAMPILAN JIKA SESEORANG ADALAH MEMBER & SEDANG PENDING (ALERT CYAN EVALUASI) */}
        {userRole === "member" && requestStatus === "pending" && (
          <div className="w-full bg-[#d9edf7] border border-[#bce8f1] text-[#31708f] p-3.5 rounded-xs flex items-center gap-2 text-left font-medium shadow-3xs">
            <Info className="w-4 h-4 text-[#31708f] shrink-0" />
            <div>Your request to open a store is under evaluation!</div>
          </div>
        )}

        {/* ❌ TAMPILAN JIKA REQUEST TOKO MEMBER DITOLAK OLEH ADMIN */}
        {userRole === "member" && requestStatus === "rejected" && (
          <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 p-3.5 rounded-xs flex items-center gap-2 text-left font-medium shadow-3xs">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <div>Your previous store verification request was rejected by administration. Please contact support.</div>
          </div>
        )}

      </div>
    </div>
  );
}
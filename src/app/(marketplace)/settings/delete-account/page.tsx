"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, X } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { deleteAccountRoute } from "./action";

export default function DeleteAccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkAuthType = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const identities = session.user.identities || [];
        setHasPassword(identities.some((identity) => identity.provider === "email"));
      }
      setLoading(false);
    };
    checkAuthType();
  }, []);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasPassword && !password) {
      toast.error("Silakan masukkan password Anda untuk konfirmasi.");
      return;
    }

    // SWAL 1: Konfirmasi Awal Tingkat Bahaya
    Swal.fire({
      title: "Are you absolutely sure?",
      text: "This action is permanent! All your data, preferences, and store configuration will be lost forever.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626", // Warna merah pekat danger
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete my account",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-sm text-sm font-sans",
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        setProcessing(true);
        const loadingToast = toast.loading("Processing account deletion...");

        const res = await deleteAccountRoute(password);
        
        toast.dismiss(loadingToast);
        setProcessing(false);

        if (res.success) {
          // SWAL 2: Notifikasi Sukses Pas Akun Lolos Dihapus
          Swal.fire({
            title: "Account Deleted!",
            text: "Your account has been successfully and permanently removed from Modesy Marketplace. Goodbye!",
            icon: "success",
            confirmButtonColor: "#00a896", // Balik ke toska Modesy
            customClass: {
              popup: "rounded-sm text-sm font-sans",
            }
          }).then(() => {
            // Setelah user klik OK di Swal, lempar paksa ke homepage
            router.push("/");
            router.refresh();
          });

        } else {
          toast.error(res.error || "Failed to delete account");
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center min-h-[250px]">
        <Loader2 className="w-8 h-8 text-[#00a896] animate-spin mb-2" />
        <p className="text-sm text-gray-500">Verifying security credential status...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-sm p-6 sm:p-8 shadow-sm font-sans mb-12">
      
      {/* Box Info Danger Merah Persis Modesy */}
      <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-sm text-xs text-red-700 font-medium leading-relaxed">
        Deleting your account is permanent and cannot be reversed. All data, including preferences and subscriptions, will be lost. The process requires admin approval, which may take some time. Please enter your password and confirm to proceed.
      </div>

      <form onSubmit={handleDeleteAccount} className="space-y-4 max-w-full">
        
        {/* Kolom password disembunyikan otomatis jika user murni Google Auth tanpa sandi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 block">
              Password
            </label>
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 border-gray-300 text-gray-700 focus-visible:ring-red-500 rounded-sm placeholder:text-gray-300 text-sm"
              required
            />
          </div>


        {/* Tombol Delete Account Merah Modesy */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={processing}
            className="h-10 bg-[#e13232] hover:bg-[#c92424] text-white text-xs font-semibold px-5 rounded-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Delete Account
          </Button>
        </div>

      </form>
    </div>
  );
}
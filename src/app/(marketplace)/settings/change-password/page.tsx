"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { changePasswordRoute } from "./action";

export default function ChangePasswordPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const checkUserSecurity = async () => {
    // Gunakan getUser() alih-alih getSession() agar datanya langsung ditarik dari server Supabase murni (Anti-Cache)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Cek apakah di dalam array identities sudah ada provider "email"
      const identities = user.identities || [];
      const passwordActive = identities.some((identity) => identity.provider === "email");
      
      // ALTERNATIF CADANGAN: Cek juga metadata atau app_metadata jika ada flag password
      setHasPassword(passwordActive);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkUserSecurity();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Konfirmasi password baru tidak cocok!");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password baru minimal harus 6 karakter.");
      return;
    }

    setSaving(true);
    const result = await changePasswordRoute(passwordForm);
    setSaving(false);

    if (result.success) {
      toast.success(hasPassword ? "Password berhasil diperbarui!" : "Password lokal berhasil dibuat!");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      
      // SOLUSI ANTI-GAGAL: Paksa state klien menjadi true karena kita tahu proses pembuatan password di server SUDAH SUKSES
      setHasPassword(true);
    } else {
      toast.error(result.error || "Gagal memperbarui password");
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center min-h-[250px]">
        <Loader2 className="w-8 h-8 text-[#00a896] animate-spin mb-2" />
        <p className="text-sm text-gray-500">Checking account security configurations...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-sm p-6 sm:p-8 shadow-sm font-sans mb-12">
      {!hasPassword && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-sm text-xs text-blue-700 font-medium">
          Anda masuk menggunakan Google. Akun Anda saat ini belum memiliki kata sandi lokal. Silakan isi form di bawah untuk membuat kata sandi baru.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-full">
        
        {/* HANYA MUNCUL JIKA USER MEMANG SUDAH PUNYA PASSWORD */}
        {hasPassword && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 block">
              Old Password
            </label>
            <Input
              type="password"
              name="oldPassword"
              placeholder="Old Password"
              value={passwordForm.oldPassword}
              onChange={handleInputChange}
              className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm placeholder:text-gray-300 text-sm"
              required
            />
          </div>
        )}

        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 block">
            {hasPassword ? "Password" : "New Password"}
          </label>
          <Input
            type="password"
            name="newPassword"
            placeholder={hasPassword ? "Password" : "New Password"}
            value={passwordForm.newPassword}
            onChange={handleInputChange}
            className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm placeholder:text-gray-300 text-sm"
            required
          />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 block">
            Confirm Password
          </label>
          <Input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={passwordForm.confirmPassword}
            onChange={handleInputChange}
            className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm placeholder:text-gray-300 text-sm"
            required
          />
        </div>

        {/* Tombol Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="h-10 bg-[#00a896] hover:bg-[#009282] text-white text-xs font-semibold px-6 rounded-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saving ? "Processing..." : hasPassword ? "Change Password" : "Create Password"}
          </Button>
        </div>

      </form>
    </div>
  );
}
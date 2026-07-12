"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@marsidev/react-turnstile"; // Import komponen Turnstile
import { verifyTurnstileToken } from "../action";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turnstileToken) {
      toast.error("Silakan selesaikan verifikasi keamanan terlebih dahulu.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);

    // Verifikasi token Turnstile ke sisi server action
    const verification = await verifyTurnstileToken(turnstileToken);
    
    if (!verification.success) {
      setLoading(false);
      toast.error(verification.error || "Gagal verifikasi bot.");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    setLoading(false);

    if (signUpError) {
      toast.error(signUpError.message);
    } else {
      toast.success("Registration successful! Please check your email.");
      router.push("/");
    }
  };

  const handleGoogleLogin = async () => {
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (googleError) toast.error(googleError.message);
  };

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen py-6 font-sans">
      <div className="max-w-[1200px] mx-auto px-4">
        
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-8 pt-2">
          <Link href="/" className="hover:text-[#00a896]">Home</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700 font-medium">Register</span>
        </nav>

        <div className="w-full max-w-[450px] mx-auto bg-white border border-gray-200 rounded-sm p-8 shadow-sm mb-12">
          <h1 className="text-2xl font-medium text-center text-[#222] mb-6">Register</h1>

          {/* Google Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full py-5 flex items-center justify-center gap-2 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-sm text-sm cursor-pointer"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connect with Google
          </Button>

          <div className="relative my-6 text-center">
            <hr className="border-gray-200" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">
              Or register with email
            </span>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleRegister}>
            <Input type="text" name="firstName" placeholder="First Name" className="h-10 border-gray-300 focus-visible:ring-[#00a896]" value={formData.firstName} onChange={handleChange} required />
            <Input type="text" name="lastName" placeholder="Last Name" className="h-10 border-gray-300 focus-visible:ring-[#00a896]" value={formData.lastName} onChange={handleChange} required />
            <Input type="email" name="email" placeholder="Email Address" className="h-10 border-gray-300 focus-visible:ring-[#00a896]" value={formData.email} onChange={handleChange} required />
            <Input type="password" name="password" placeholder="Password" className="h-10 border-gray-300 focus-visible:ring-[#00a896]" value={formData.password} onChange={handleChange} required />
            <Input type="password" name="confirmPassword" placeholder="Confirm Password" className="h-10 border-gray-300 focus-visible:ring-[#00a896]" value={formData.confirmPassword} onChange={handleChange} required />

            {/* Checkbox Persetujuan */}
            <div className="flex items-center gap-2 py-1">
              <input 
                type="checkbox"
                id="terms" 
                className="border border-gray-300 w-4 h-4 rounded-xs transition-colors accent-[#00a896] cursor-pointer" 
                checked={formData.agreeTerms} 
                onChange={(e) => setFormData((prev) => ({ ...prev, agreeTerms: e.target.checked }))} 
                required 
              />
              <label htmlFor="terms" className="text-xs text-gray-500 cursor-pointer select-none">
                I have read and agree to the <Link href="/terms" className="text-gray-700 underline font-medium hover:text-[#00a896]">Terms & Conditions</Link>
              </label>
            </div>

            {/* Cloudflare Turnstile Box */}
            <div className="flex justify-center my-2">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!}
                  options={{ theme: "light" }}
                  onSuccess={(token) => {
                    setTurnstileToken(token);
                  }}
                  onExpire={() => {
                    setTurnstileToken("");
                    toast.error("Verifikasi keamanan kedaluwarsa, silakan centang ulang.");
                  }}
                />
            </div>

            <Button type="submit" className="w-full h-11 bg-[#00a896] hover:bg-[#009282] text-white font-medium cursor-pointer" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister?: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSwitchToRegister,
}: LoginModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Logika Login Email & Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(false);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login successful!");
      setEmail("");
      setPassword("");
      onClose();
      router.refresh(); // Refresh halaman agar state user di navbar ter-update
    }
  };

  // 2. Logika Login via Google OAuth
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-6 gap-0 border-none rounded-sm bg-white font-sans shadow-lg">
        <DialogHeader className="mb-5">
          <DialogTitle className="text-2xl font-medium text-center text-[#222]">
            Login
          </DialogTitle>
        </DialogHeader>

        {/* Google Auth Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full py-5 flex items-center justify-center gap-2 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-sm text-sm cursor-pointer"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {/* Google Icon SVG */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Connect with Google
        </Button>

        <div className="relative my-5 text-center">
          <hr className="border-gray-200" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">
            Or login with email
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="Email Address"
            className="h-10 border-gray-300 text-[#444] placeholder:text-gray-400 focus-visible:ring-[#00a896] rounded-sm shadow-xs"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <div className="space-y-1.5">
            <Input
              type="password"
              placeholder="Password"
              className="h-10 border-gray-300 text-[#444] placeholder:text-gray-400 focus-visible:ring-[#00a896] rounded-sm shadow-xs"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                onClick={() => console.log("Forgot password clicked")}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {/* Login Action Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#00a896] hover:bg-[#009282] text-white font-medium rounded-sm transition-colors text-sm cursor-pointer shadow-xs"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="text-xs text-center text-gray-500 mt-5">
          Don't have an account?{" "}
          <button
            type="button"
            className="text-[#00a896] font-medium hover:underline cursor-pointer"
            onClick={() => {
              onClose();
              if (onSwitchToRegister) onSwitchToRegister();
            }}
          >
            Register
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
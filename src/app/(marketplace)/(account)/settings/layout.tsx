"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, MapPin, Truck, Link as LinkIcon, Share2, Lock, UserX, UserCog } from "lucide-react";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles: string[]; // Role apa saja yang boleh melihat menu ini
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [role, setRole] = useState<string>("member");

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (data) setRole(data.role);
      }
    };
    fetchUserRole();
  }, []);

  // Daftar navigasi sidebar kiri lengkap dengan aturan filter role sesuai gambar
  const menuItems: MenuItem[] = [
    { title: "Update Profile", href: "/settings/edit-profile", icon: <UserCog className="size-4" />, roles: ["member", "vendor", "moderator", "admin"] },
    { title: "Location", href: "/settings/location", icon: <MapPin className="size-4" />, roles: ["member", "vendor", "moderator", "admin"] },
    { title: "Shipping Address", href: "/settings/shipping-address", icon: <Truck className="size-4" />, roles: ["member", "vendor", "moderator"] },
    { title: "Affiliate Links", href: "/settings/affiliate-links", icon: <LinkIcon className="size-4" />, roles: ["vendor", "moderator", "member"] }, // Sesuai Gambar 2 & 3
    { title: "Social Media", href: "/settings/social-media", icon: <Share2 className="size-4" />, roles: ["member", "vendor", "moderator", "admin"] },
    { title: "Change Password", href: "/settings/change-password", icon: <Lock className="size-4" />, roles: ["member", "vendor", "moderator", "admin"] },
    { title: "Delete Account", href: "/settings/delete-account", icon: <UserX className="size-4" />, roles: ["member", "vendor", "moderator", "admin"] },
  ];

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen py-6 font-sans">
      <div className="max-w-[1200px] mx-auto px-4">
        
        {/* ================= BREADCRUMB ================= */}
        {(() => {
          // Cari menu yang cocok dengan halaman yang sedang dibuka
          const activeMenu = menuItems.find((item) => pathname === item.href);
          const pageTitle = activeMenu?.title ?? "Settings";
          return (
            <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 pt-2">
              <Link href="/" className="hover:text-[#00a896]">Home</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-400">Profile Settings</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700 font-medium">{pageTitle}</span>
            </nav>
          );
        })()}

        <h1 className="text-2xl font-medium text-gray-800 mb-6">Profile Settings</h1>

        {/* Layout Grid: Kiri Sidebar, Kanan Konten Form */}
        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* SIDEBAR NAVIGASI KIRI */}
          <div className="w-full bg-white border border-gray-200 rounded-sm overflow-hidden p-2 shadow-xs space-y-0.5">
            {menuItems
              .filter((item) => item.roles.includes(role)) // Filter menu berdasarkan role aktif user
              .map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={index}
                    href={item.href}
                    className={`w-full h-11 px-4 flex items-center gap-3 text-sm transition-colors rounded-sm font-medium ${
                      isActive
                        ? "bg-[#f4f5f7] text-gray-900 border-l-[3px] border-[#00a896] pl-[13px]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                );
              })}
          </div>

          {/* KONTEN DINAMIS KANAN (Form isi) */}
          <div className="md:col-span-3">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
}
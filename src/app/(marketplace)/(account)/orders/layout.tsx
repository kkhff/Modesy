"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBasket, FileText, Download, RefreshCw } from "lucide-react";

interface OrderMenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Daftar navigasi sidebar sesuai menu transaksi Modesy di gambar
  const menuItems: OrderMenuItem[] = [
    { title: "Orders", href: "/orders", icon: <ShoppingBasket className="size-4" /> },
    { title: "Quote Requests", href: "/orders/quote-requests", icon: <FileText className="size-4" /> },
    { title: "Downloads", href: "/orders/downloads", icon: <Download className="size-4" /> },
    { title: "Refund Requests", href: "/orders/refund-requests", icon: <RefreshCw className="size-4" /> },
  ];

  return (
    <div className="w-full bg-white min-h-screen py-6 font-sans antialiased text-slate-600">
      <div className="max-w-[1250px] mx-auto px-4">
        
        {/* ================= BREADCRUMB ================= */}
        {(() => {
          const activeMenu = menuItems.find((item) => pathname === item.href);
          const pageTitle = activeMenu?.title ?? "Orders";
          return (
            <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-4 font-normal">
              <Link href="/" className="hover:text-[#00a896] transition-colors">Home</Link>
              <span>/</span>
              <span className="text-slate-700 font-medium">{pageTitle}</span>
            </nav>
          );
        })()}

        {/* TITLE UTAMA */}
        <h1 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">Orders</h1>

        {/* LAYOUT GRID SIDEBAR & KONTEN */}
        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          
          {/* SIDEBAR NAVIGASI KIRI */}
          <div className="w-full flex flex-col space-y-1">
            {menuItems.map((item, index) => {
              // Cek active state berdasarkan kecocokan url path
              const isActive = pathname === item.href;
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={`w-full h-9 px-4 flex items-center gap-3 text-xs transition-all rounded-xs font-medium ${
                    isActive
                      ? "bg-[#f4f5f7] text-slate-800 font-bold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span className={isActive ? "text-slate-700" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>

          {/* KONTEN DINAMIS KANAN (Tempat data Supabase orders/page.tsx nampil) */}
          <div className="md:col-span-3">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
}
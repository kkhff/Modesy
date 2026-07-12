"use client";

import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Header Utama Modesy (Floor 1, 2, 3 + Mega Menu) */}
      <Header />

      {/* Konten Halaman Toko / Katalog */}
      <main className="flex-grow w-full">
        {children}
      </main>

      {/* Footer Global Marketplace */}
      <Footer />
    </>
  );
}
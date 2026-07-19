import React from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";
import CouponForm from "@/components/dashboard/CouponForm";

export default function AddCouponPage() {
  return (
    <div className="w-full bg-[#f7f8f9] min-h-screen font-sans antialiased text-xs text-slate-600 p-6 space-y-4">
      
      {/* ATAS: NAVIGASI KOSMETIK MENU KUPON */}
      <div className="bg-white border border-gray-200/80 rounded-sm p-4 flex justify-between items-center shadow-3xs">
        <h1 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-[#00a896]" /> Add Coupon
        </h1>
        <Link
          href="/dashboard/coupons"
          className="h-9 px-4 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1.5 transition-colors text-xs"
        >
          Coupons
        </Link>
      </div>

      {/* RENDER FORM UTAMA */}
      <CouponForm />
    </div>
  );
} 
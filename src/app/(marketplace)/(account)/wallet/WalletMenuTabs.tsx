"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function WalletMenuTabs({ isSeller }: { isSeller: boolean }) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <div className="w-full border-b border-gray-200 flex flex-wrap gap-2 text-xs font-bold text-gray-500 bg-white px-6 pt-4 rounded-t-sm">
      {isSeller && (
        <Link href="/wallet/earnings" className={`pb-3 px-3 border-b-2 transition-all ${isActive("/wallet/earnings") ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
          Earnings
        </Link>
      )}
      <Link href="/wallet/referral" className={`pb-3 px-3 border-b-2 transition-all ${isActive("/wallet/referral") ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
        Referral Earnings
      </Link>
      <Link href="/wallet/deposits" className={`pb-3 px-3 border-b-2 transition-all ${isActive("/wallet/deposits") ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
        Deposits
      </Link>
      <Link href="/wallet/expenses" className={`pb-3 px-3 border-b-2 transition-all ${isActive("/wallet/expenses") ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
        Expenses
      </Link>
        <Link href="/wallet/payouts" className={`pb-3 px-3 border-b-2 transition-all ${isActive("/wallet/payouts") ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
          Payouts
        </Link>
      <Link href="/wallet/set-payout" className={`pb-3 px-3 border-b-2 transition-all ${isActive("/wallet/set-payout") ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
        Set Payout Account
      </Link>
    </div>
  );
}
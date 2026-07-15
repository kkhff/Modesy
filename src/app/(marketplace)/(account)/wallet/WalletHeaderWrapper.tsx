"use client";

import React, { useState } from "react";
import { Wallet, Plus } from "lucide-react";
import TopUpModal from "@/components/modals/TopUpModal";

interface WalletHeaderWrapperProps {
  balance: number;
}

export default function WalletHeaderWrapper({ balance }: WalletHeaderWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* CARD SALDO UTAMA */}
      <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-sm p-6 text-center relative shadow-3xs mb-8">
        <div className="absolute top-4 right-4">
          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xs px-3 py-1.5 font-bold text-gray-600 transition-colors cursor-pointer text-[11px]"
          >
            <Plus className="w-3.5 h-3.5 text-[#00a896]" /> Add Funds
          </button>
        </div>
        
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-teal-50 rounded-full text-[#00a896]">
            <Wallet className="w-7 h-7" />
          </div>
        </div>
        
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Wallet Balance</p>
        <h2 className="text-2xl font-black text-slate-800 mt-1">
          ${balance.toFixed(2)}
        </h2>
      </div>

      {/* RENDER MODAL CHECKOUT DEPOSIT */}
      <TopUpModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
"use client";

import React from "react";
import { X, Check } from "lucide-react";
import Swal from "sweetalert2";

interface PromoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number | null;
  productTitle: string;
}

export default function PromoteModal({ isOpen, onClose, productId, productTitle }: PromoteModalProps) {
  if (!isOpen || !productId) return null;

  const handleSelectPlan = (planName: string, price: string) => {
    onClose();
    // Sementara kita lempar ke Swal dulu sebelum kamu integrasiin ke Midtrans / payment gateway nanti
    Swal.fire({
      title: "Plan Selected!",
      text: `You chose the ${planName} (${price}) for product: "${productTitle}". Next step: Checkout payment integration.`,
      icon: "success",
      confirmButtonColor: "#00a896",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-sm shadow-xl overflow-hidden relative border border-slate-200">
        
        {/* Tombol Close Pojok Kanan Atas */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="p-6 text-center border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-700 uppercase tracking-wide">Promote Your Product</h2>
        </div>

        {/* Konten Utama Grid Card */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/50">
          
          {/* 1. Daily Plan Card */}
          <div className="bg-white border border-slate-200 rounded-sm p-6 flex flex-col items-center justify-between shadow-2xs hover:border-[#00a896] transition-all group">
            <div className="text-center w-full space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Daily Plan</h3>
              <div className="text-2xl font-extrabold text-rose-500 font-sans">
                $0.10<span className="text-xs font-normal text-slate-400">/Day</span>
              </div>
              <div className="w-full border-t border-dashed border-slate-100 my-4" />
              <ul className="text-[11px] text-slate-500 space-y-2.5 text-left pl-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Featured Badge</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Appear on the Homepage</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Show first in search lists</li>
              </ul>
            </div>
            <button 
              onClick={() => handleSelectPlan("Daily Plan", "$0.10/day")}
              className="mt-6 w-full bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold py-2 rounded-xs transition-colors shadow-2xs cursor-pointer uppercase tracking-wider"
            >
              Choose Plan
            </button>
          </div>

          {/* 2. Monthly Plan Card */}
          <div className="bg-white border border-slate-200 rounded-sm p-6 flex flex-col items-center justify-between shadow-2xs hover:border-[#00a896] transition-all group">
            <div className="text-center w-full space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Monthly Plan</h3>
              <div className="text-2xl font-extrabold text-rose-500 font-sans">
                $1<span className="text-xs font-normal text-slate-400">/Month</span>
              </div>
              <div className="w-full border-t border-dashed border-slate-100 my-4" />
              <ul className="text-[11px] text-slate-500 space-y-2.5 text-left pl-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Featured Badge</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Appear on the Homepage</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Show first in search lists</li>
              </ul>
            </div>
            <button 
              onClick={() => handleSelectPlan("Monthly Plan", "$1/month")}
              className="mt-6 w-full bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold py-2 rounded-xs transition-colors shadow-2xs cursor-pointer uppercase tracking-wider"
            >
              Choose Plan
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
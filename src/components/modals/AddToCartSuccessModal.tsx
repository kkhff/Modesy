"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

interface AddToCartSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  productPrice: number;
  productImage: string;
  addedQuantity: number;
}

export default function AddToCartSuccessModal({
  isOpen,
  onClose,
  productTitle,
  productPrice,
  productImage,
  addedQuantity,
}: AddToCartSuccessModalProps) {
  if (!isOpen) return null;

  const subtotal = productPrice * addedQuantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans animate-fade-in">
      <div className="bg-white rounded-xs border border-gray-200 max-w-[680px] w-full p-6 relative shadow-xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Tombol Silang Pojok Kanan Atas */}
        <button 
          type="button" 
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full flex items-center justify-center shadow-md text-lg border border-gray-100 cursor-pointer"
        >
          &times;
        </button>

        {/* Status Alert Berhasil */}
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-6 pb-2 border-b border-gray-50">
          <Check className="w-4 h-4 text-emerald-600 stroke-[3px]" />
          <span>Product successfully added to your cart!</span>
        </div>

        {/* Konten Utama Grid Membelah Kiri-Kanan */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Sisi Kiri: Detail Info Produk */}
          <div className="md:col-span-7 flex gap-4 items-center">
            <div className="w-24 h-28 border border-gray-100 rounded-xs bg-gray-50 overflow-hidden shrink-0">
              <img src={productImage} alt={productTitle} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">
                {productTitle}
              </h3>
              <p className="text-sm font-extrabold text-gray-900">${productPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* Sisi Kanan: Summary Total & Navigasi Aksi */}
          <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 space-y-4">
            <div className="text-xs space-y-2 font-medium text-slate-500">
              <span className="block text-slate-400 font-bold mb-1">Product cart summary:</span>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span className="text-gray-900 font-bold">{addedQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-gray-900 font-extrabold">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Tombol Navigasi Menuju Keranjang / Kasir */}
            <div className="space-y-2 pt-2">
              <Link 
                href="/cart"
                className="w-full h-10 bg-[#00a896] hover:bg-[#009282] text-white font-bold text-xs rounded-xs flex items-center justify-center transition-all shadow-2xs"
              >
                View Cart
              </Link>
              <Link 
                href="/checkout"
                className="w-full h-10 bg-white hover:bg-gray-50 border border-slate-300 text-gray-700 font-bold text-xs rounded-xs flex items-center justify-center transition-all shadow-3xs"
              >
                Checkout
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
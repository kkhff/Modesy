"use client";

import React, { useState, useMemo } from "react";

export default function ProductDetailClient({ product }: { product: any }) {
  const price = Number(product.price) || 0;
  const discountedPrice = product.discounted_price !== null ? Number(product.discounted_price) : null;
  const hasDiscount = product.discount_rate > 0 || (discountedPrice !== null && discountedPrice < price);
  const finalPrice = hasDiscount && discountedPrice !== null ? discountedPrice : price;

  // 1. Ambil blueprint variasi dari kolom JSONB database
  const blueprintOptions = useMemo(() => {
    return Array.isArray(product.variation_options) ? product.variation_options : [];
  }, [product.variation_options]);

  // 2. Ekstrak variasi nilai unik secara dinamis berdasarkan urutan indeks kombinasi nama variasi
  const extractedOptions = useMemo(() => {
    return blueprintOptions.map((opt: any, index: number) => {
      const uniqueValues = new Set<string>();
      const valueDetails: any[] = [];

      product.variations.forEach((v: any) => {
        if (!v.name) return;
        // Misal v.name = "Red, S", kita pecah jadi ["Red", "S"]
        const splitNames = v.name.split(",").map((s: string) => s.trim());
        const targetValue = splitNames[index]; // Ambil value sesuai posisi index opsi

        if (targetValue && !uniqueValues.has(targetValue)) {
          uniqueValues.add(targetValue);
          valueDetails.push({
            name: targetValue,
            sku: v.sku,
            variantImage: v.variant_image_url || null,
            // Jika lu ada field color tambahan di tabel variasi bisa diselipin di sini
          });
        }
      });

      return {
        name: opt.name, // e.g., "Color" atau "Size"
        type: opt.type, // e.g., "swatch_color", "dropdown", "radio"
        values: valueDetails,
      };
    });
  }, [blueprintOptions, product.variations]);

  // State untuk menyimpan opsi yang sedang dipilih user saat ini
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    extractedOptions.forEach((opt: any) => {
      if (opt.values.length > 0) initial[opt.name] = opt.values[0].name;
    });
    return initial;
  });

  const handleSelectOption = (optName: string, valName: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optName]: valName }));
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-8 font-sans text-slate-700">
      
      {/* KIRI: IMAGE AREA CONTAINER */}
      <div className="w-full flex gap-4">
        <div className="w-full aspect-[4/5] bg-gray-50 border border-gray-100 rounded-xs overflow-hidden">
          <img 
            src={product.image_urls?.[0] || "https://placehold.co/400x500"} 
            alt={product.title} 
            className="w-full h-full object-cover" 
          />
        </div>
      </div>

      {/* KANAN: PRODUCT INFO & DYNAMIC VARIATION OPTION SELECTION */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.title}</h1>
          <p className="text-xs text-gray-400 mt-1">SKU: <span className="font-mono font-medium text-gray-600">{product.sku}</span></p>
        </div>

        {/* AREA HARGA */}
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="text-3xl font-extrabold text-[#00a896]">${finalPrice.toFixed(2)}</span>
          {hasDiscount && (
            <>
              <span className="text-base text-gray-400 line-through">${price.toFixed(2)}</span>
              <span className="bg-red-50 text-red-500 font-bold text-xs px-2 py-0.5 rounded-xs">-{product.discount_rate}%</span>
            </>
          )}
        </div>

        {/* 🌟 RENDER BARIS VARIASI SECARA DINAMIS TERGANTUNG DATABASE 🌟 */}
        <div className="space-y-6 border-b border-gray-100 pb-6">
          {extractedOptions.map((opt: any) => {
            if (opt.values.length === 0) return null;

            return (
              <div key={opt.name} className="space-y-2">
                {/* Judul Opsi + Nilai yang Terpilih saat ini (e.g. Color: Red) */}
                <span className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {opt.name}: <span className="font-semibold text-gray-500 normal-case">{selectedOptions[opt.name]}</span>
                </span>

                <div className="flex flex-wrap gap-2">
                  {opt.values.map((val: any) => {
                    const isSelected = selectedOptions[opt.name] === val.name;

                    // A. KONDISI TIPE SWATCH (Gambar Kecil atau Varian Warna Kotak)
                    if (opt.type === "swatch_color" || opt.type === "swatch_image") {
                      return (
                        <button
                          key={val.name}
                          type="button"
                          onClick={() => handleSelectOption(opt.name, val.name)}
                          className={`w-12 h-12 rounded-xs border-2 overflow-hidden bg-gray-50 transition-all ${
                            isSelected ? "border-[#00a896] scale-105 shadow-xs" : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {val.variantImage ? (
                            <img src={val.variantImage} alt={val.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 block p-1 truncate">{val.name}</span>
                          )}
                        </button>
                      );
                    }

                    // B. KONDISI TIPE TOMBOL / KOTAK TEKS BIASA (e.g. Untuk Size / Ukuran S, M, L)
                    return (
                      <button
                        key={val.name}
                        type="button"
                        onClick={() => handleSelectOption(opt.name, val.name)}
                        className={`min-w-10 h-9 px-3 text-xs font-bold rounded-xs border transition-all ${
                          isSelected 
                            ? "bg-[#00a896] border-[#00a896] text-white shadow-xs" 
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {val.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* BUTTON ADD TO CART */}
        <div className="pt-2">
          <button type="button" className="w-full md:w-auto px-12 h-11 bg-[#00a896] hover:bg-[#009282] text-white font-bold text-sm rounded-xs shadow-xs transition-colors uppercase">
            Add to Cart
          </button>
        </div>

      </div>
    </div>
  );
}
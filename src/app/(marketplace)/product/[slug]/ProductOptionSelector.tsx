"use client";

import React, { useState } from "react";

interface VariationBlueprint {
  name: string;
  type: "dropdown" | "radio" | "swatch_color" | "swatch_image";
}

interface ProductVariantDb {
  id: number;
  name: string; // e.g., "Red, S" atau "Red"
  sku: string;
  price: number;
  discounted_price: number | null;
  stock: number;
  variant_image_url: string | null;
  color: string | null; // e.g., "#6a7575"
}

interface SelectorProps {
  variationOptions: VariationBlueprint[]; // Dari public.products.variation_options (yang simpel)
  variations: ProductVariantDb[];        // Dari public.product_variations
}

export default function ProductOptionsSelector({ variationOptions, variations }: SelectorProps) {
  // 1. Ambil state pilihan user, misal: { "Color": "Red", "Size": "S" }
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  if (!variationOptions || variationOptions.length === 0 || !variations || variations.length === 0) {
    return null;
  }

  // 2. Ekstrak value unik secara dinamis berdasarkan urutan indeks nama variasi
  const renderedOptions = variationOptions.map((opt, idx) => {
    const uniqueValuesMap = new Map<string, { color?: string; image?: string }>();

    variations.forEach((v) => {
      if (!v.name) return;
      // Pecah "Red, S" menjadi ["Red", "S"]
      const splitNames = v.name.split(",").map((s) => s.trim());
      const valueName = splitNames[idx]; // Ambil sesuai indeks opsi (0 untuk Color, 1 untuk Size)

      if (valueName && !uniqueValuesMap.has(valueName)) {
        uniqueValuesMap.set(valueName, {
          color: v.color || undefined,
          image: v.variant_image_url || undefined,
        });
      }
    });

    return {
      name: opt.name,
      type: opt.type,
      values: Array.from(uniqueValuesMap.entries()).map(([name, data]) => ({
        name,
        ...data,
      })),
    };
  });

  const handleSelect = (optionName: string, valueName: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: valueName }));
  };

  // 3. Cari baris variasi aktif saat ini untuk nentuin harga / stok / SKU final yang dipilih user
  const currentMatchedVariant = variations.find((v) => {
    const splitNames = v.name.split(",").map((s) => s.trim());
    return variationOptions.every((opt, idx) => splitNames[idx] === selectedOptions[opt.name]);
  });

  return (
    <div className="space-y-6 my-4 font-sans text-sm">
      {renderedOptions.map((option) => {
        const currentSelected = selectedOptions[option.name];

        return (
          <div key={option.name} className="space-y-2">
            <div className="text-gray-800 font-semibold">
              {option.name}: <span className="text-gray-500 font-normal">{currentSelected || "Select..."}</span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {/* TIPE A: SWATCH COLOR */}
              {option.type === "swatch_color" &&
                option.values.map((val) => (
                  <button
                    key={val.name}
                    type="button"
                    onClick={() => handleSelect(option.name, val.name)}
                    style={{ backgroundColor: val.color || "#6a7575" }}
                    className={`w-8 h-8 rounded-xs border-2 transition-all cursor-pointer relative ${
                      currentSelected === val.name ? "border-[#00a896] scale-105" : "border-gray-200"
                    }`}
                    title={val.name}
                  >
                    {currentSelected === val.name && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                    )}
                  </button>
                ))}

              {/* TIPE B: SWATCH IMAGE */}
              {option.type === "swatch_image" &&
                option.values.map((val) => (
                  <button
                    key={val.name}
                    type="button"
                    onClick={() => handleSelect(option.name, val.name)}
                    className={`w-12 h-12 rounded-xs border overflow-hidden transition-all cursor-pointer ${
                      currentSelected === val.name ? "border-[#00a896] ring-1 ring-[#00a896]" : "border-gray-200"
                    }`}
                    title={val.name}
                  >
                    <img src={val.image || "https://placehold.co/50"} alt={val.name} className="w-full h-full object-cover" />
                  </button>
                ))}

              {/* TIPE C: RADIO BUTTONS (Size dll) */}
              {option.type === "radio" &&
                option.values.map((val) => (
                  <button
                    key={val.name}
                    type="button"
                    onClick={() => handleSelect(option.name, val.name)}
                    className={`min-w-10 h-8 px-3 text-xs font-semibold border rounded-xs transition-all cursor-pointer ${
                      currentSelected === val.name
                        ? "border-[#00a896] bg-teal-50 text-[#00a896]"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {val.name}
                  </button>
                ))}

              {/* TIPE D: DROPDOWN */}
              {option.type === "dropdown" && (
                <select
                  value={currentSelected || ""}
                  onChange={(e) => handleSelect(option.name, e.target.value)}
                  className="border border-gray-200 h-9 px-3 rounded-xs text-xs bg-white text-gray-700 focus:outline-none focus:border-[#00a896] cursor-pointer"
                >
                  <option value="">Choose {option.name}</option>
                  {option.values.map((val) => (
                    <option key={val.name} value={val.name}>{val.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      })}

      {/* 🌟 PREVIEW INFO VARIASI HASIL KLIK USER (INFO HARGA / SKU LIVE) */}
      {currentMatchedVariant && (
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-sm text-xs font-mono space-y-1">
          <div>Matched Variant: <span className="font-bold text-slate-800">{currentMatchedVariant.name}</span></div>
          <div>SKU: {currentMatchedVariant.sku}</div>
          <div>Price: ${currentMatchedVariant.price}</div>
          <div>Stock: {currentMatchedVariant.stock}</div>
        </div>
      )}
    </div>
  );
}
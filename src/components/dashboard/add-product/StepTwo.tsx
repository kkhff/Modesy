"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { GripVertical, Trash2, Check, ArrowLeft, Video, Music, Plus, X, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

interface OptionValue {
  id: string;
  name: string;
  color?: string;
  image?: File | null;
  main_image?: File | null;
  imagePreview?: string;
  mainImagePreview?: string;
}

interface ProductOption {
  id: string;
  name: string;
  type: "dropdown" | "radio" | "swatch_color" | "swatch_image";
  values: OptionValue[];
}

interface StepTwoProps {
  data: any;
  updateData: React.Dispatch<React.SetStateAction<any>>;
  onBack: () => void;
  onSubmit: () => void;
}

export default function StepTwo({ data, updateData, onBack, onSubmit }: StepTwoProps) {
  const isPhysical = data.productType === "physical";
  const isDigital = data.productType === "digital";

  // --- STATE LOKAL HARGA ---
  const [price, setPrice] = useState<number>(Number(data.price) || 0);
  const [discountedPrice, setDiscountedPrice] = useState<number>(Number(data.discountedPrice) || 0);
  const [vatRate, setVatRate] = useState<number>(Number(data.vatRate) || 0);
  const [noDiscount, setNoDiscount] = useState<boolean>(false);
  const [noVat, setNoVat] = useState<boolean>(false);

  const commissionRate = 15;
  const targetPrice = noDiscount ? price : discountedPrice;
  const netEarnings = targetPrice - (targetPrice * commissionRate) / 100;

  // --- STATE DINAMIS PRODUCT OPTIONS ---
  const [options, setOptions] = useState<ProductOption[]>(() => {
    if (data.options && data.options.length > 0) return data.options;
    return [{ id: "opt_1", name: "Color", type: "swatch_color", values: [] }];
  });

  // 🌟 FIX AMAN 1: Hanya isi state lokal dari DB saat halaman pertama kali dibuka (Initial Hydration)
  // Cara ini memutus rantai infinite loop karena dependency array-nya kosong []
  useEffect(() => {
    if (data.options && data.options.length > 0) {
      setOptions(data.options);
    }
  }, []);

  // --- STATE TABEL VARIASI MATRIX ---
  const [variants, setVariants] = useState<any[]>(() => {
    if (data.variations && data.variations.length > 0) {
      return data.variations.map((v: any) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        discountedPrice: v.discountedPrice !== undefined ? v.discountedPrice : v.discounted_price,
        quantity: v.quantity !== undefined ? v.quantity : v.stock,
        weight: v.weight,
        active: v.active !== undefined ? v.active : (v.is_active !== undefined ? v.is_active : true),
        mainImagePreview: v.mainImagePreview || v.variant_image_url || null,
        is_default: v.is_default || false,
      }));
    }
    return [];
  });
  
  const [defaultVariantId, setDefaultVariantId] = useState<string>(() => {
    if (data.variations && data.variations.length > 0) {
      const defaultVar = data.variations.find((v: any) => v.is_default);
      if (defaultVar) return String(defaultVar.id);
    }
    return "";
  });

  // --- STATE MEDIA PREVIEW ---
  const [videoName, setVideoName] = useState<string>("");
  const [audioName, setAudioName] = useState<string>("");
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // --- STATE API LOKASI GEOGRAFI ---
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [selectedCountry, setSelectedCountry] = useState({ name: "", iso2: "" });
  const [selectedState, setSelectedState] = useState({ name: "", iso2: "" });
  const [selectedCity, setSelectedCity] = useState("");

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const apiHeaders = {
    "X-CSCAPI-KEY": process.env.NEXT_PUBLIC_CSC_API_KEY || "",
  };

  // =========================================================================
  // --- 🌟 KARTESIAN MATRIX GENERATOR (ANTI-BOCOR / AMAN DARI SIKLUS LOOP) ---
  // =========================================================================
  useEffect(() => {
    const validOptions = options.filter(
      (opt) => opt.values.some((v) => v.name.trim() !== "")
    );

    if (validOptions.length === 0) {
      setVariants([]);
      updateData((prev: any) => ({ ...prev, variations: [], options: options }));
      return;
    }

    const cartesianProduct = (arr: any[][]): any[][] => {
      return arr.reduce(
        (a, b) => a.flatMap((d) => b.map((e) => [...d, e])),
        [[]]
      );
    };

    const optionsValuesArray = validOptions.map((opt) =>
      opt.values
        .filter((v) => v.name.trim() !== "")
        .map((v) => ({
          optionId: opt.id,
          optionType: opt.type,
          valueId: v.id,
          valueName: v.name,
          color: v.color,
          imagePreview: v.imagePreview,
          mainImagePreview: v.mainImagePreview,
        }))
    );

    const combinations = cartesianProduct(optionsValuesArray);
    const baseSku = data.sku ? data.sku.trim() : "";

    const newVariants = combinations.map((combo, index) => {
      const variantName = combo.map((c) => c.valueName).join(", ");
      const cleanVarName = variantName.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      const formattedSku = baseSku ? `${baseSku}-${cleanVarName}` : `-${cleanVarName}`;
      const primaryStage = combo.find((c) => c.optionType === "swatch_color" || c.optionType === "swatch_image") || combo[0];
      
      const existingLocalState = variants && variants[index];

      const isNameChanged = existingLocalState && existingLocalState.name !== variantName;
      
      const finalSku = isNameChanged ? formattedSku : (existingLocalState?.sku || formattedSku);

      return {
        id: existingLocalState?.id || `var_temp_${index}_${Math.random().toString(36).substr(2, 5)}`,
        name: variantName,
        type: primaryStage.optionType,
        color: primaryStage.color,
        imagePreview: primaryStage.imagePreview,
        mainImagePreview: existingLocalState?.mainImagePreview || primaryStage.mainImagePreview,
        sku: finalSku,
        price: existingLocalState?.price || "",
        discountedPrice: existingLocalState?.discountedPrice || "",
        quantity: existingLocalState?.quantity || "",
        weight: existingLocalState?.weight || "",
        active: existingLocalState?.active !== undefined ? existingLocalState.active : true,
      };
    });

    setVariants(newVariants);

    // 🔥 FIX AMAN 2: Setorkan data variations & options secara bersamaan di sini
    updateData((prev: any) => ({
      ...prev,
      options: options, // Di-update berbarengan agar form global tersinkronisasi
      variations: newVariants.map((nv) => ({
        ...nv,
        is_default: String(defaultVariantId) === String(nv.id),
      }))
    }));

    if (newVariants.length > 0 && (!defaultVariantId || !newVariants.some((v) => String(v.id) === String(defaultVariantId)))) {
      setDefaultVariantId(String(newVariants[0].id));
    }
  }, [options, data.sku]);

  // --- SINKRONISASI API GEOGRAFI ---
  useEffect(() => {
    if (data.country && countries.length > 0) {
      const foundCountry = countries.find(c => c.name.toLowerCase() === data.country.toLowerCase());
      if (foundCountry && selectedCountry.iso2 !== foundCountry.iso2) {
        setSelectedCountry({ iso2: foundCountry.iso2, name: foundCountry.name });
      }
    }
  }, [data.country, countries]);

  useEffect(() => {
    if (data.state && states.length > 0) {
      const foundState = states.find(s => s.name.toLowerCase() === data.state.toLowerCase());
      if (foundState && selectedState.iso2 !== foundState.iso2) {
        setSelectedState({ iso2: foundState.iso2, name: foundState.name });
      }
    }
  }, [data.state, states]);

  useEffect(() => {
    const calculatedPrice = noDiscount ? price : discountedPrice;
    
    // Hitung persentase diskon (rate) secara presisi bulat
    const rate = price > 0 ? Math.round(((price - calculatedPrice) / price) * 100) : 0;

    const mappedVariants = variants.map((v) => ({
      ...v,
      is_default: String(defaultVariantId) === String(v.id),
    }));

    // 🌟 SINKRONISASI TOTAL KE PARENT STATE
    updateData((prev: any) => ({
      ...prev,
      price,
      // Menyimpan nominal harga setelah diskon untuk tabel public.products
      discountedPrice: noDiscount ? price : discountedPrice, 
      // Menyimpan rate persen diskonnya
      discountRate: noDiscount ? 0 : (rate < 0 ? 0 : rate),
      vatRate: noVat ? 0 : vatRate,
      variations: mappedVariants,
    }));
  }, [price, discountedPrice, vatRate, noDiscount, noVat, defaultVariantId, variants]);


  // --- API FETCH GEOGRAFI ---
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch("https://api.countrystatecity.in/v1/countries", { headers: apiHeaders });
        if (res.ok) setCountries(await res.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (!selectedCountry.iso2) {
      setStates([]);
      setCities([]);
      return;
    }
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await fetch(`https://api.countrystatecity.in/v1/countries/${selectedCountry.iso2}/states`, { headers: apiHeaders });
        setStates(await res.json());
        setSelectedState({ name: "", iso2: "" });
        setSelectedCity("");
        setCities([]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, [selectedCountry.iso2]);

  useEffect(() => {
    if (!selectedCountry.iso2 || !selectedState.iso2) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(`https://api.countrystatecity.in/v1/countries/${selectedCountry.iso2}/states/${selectedState.iso2}/cities`, { headers: apiHeaders });
        setCities(await res.json());
        setSelectedCity("");
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, [selectedCountry.iso2, selectedState.iso2]);

  // --- HANDLERS ---
  const addProductOption = () => {
    const newOpt: ProductOption = {
      id: `opt_${Date.now()}`,
      name: "New Option",
      type: "dropdown",
      values: [{ id: `val_${Date.now()}`, name: "" }],
    };
    setOptions([...options, newOpt]);
  };

  const removeProductOption = (id: string) => {
    setOptions(options.filter((o) => o.id !== id));
  };

  const updateOptionMeta = (id: string, field: keyof ProductOption, value: any) => {
    setOptions(
      options.map((o) => {
        if (o.id === id) {
          if (field === "type") {
            const resetValues = o.values.map((v) => ({
              ...v,
              color: value === "swatch_color" ? "#6a7575" : undefined,
              image: null,
              main_image: null,
              imagePreview: undefined,
              mainImagePreview: undefined,
            }));
            return { ...o, [field]: value, values: resetValues };
          }
          return { ...o, [field]: value };
        }
        return o;
      })
    );
  };

  const generateRandomSKU = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 10; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    updateData((prev: any) => ({ ...prev, sku: result }));
    setVariants((prev) =>
      prev.map((v) => {
        const cleanVarName = v.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
        return { ...v, sku: `${result}-${cleanVarName}` };
      })
    );
  };

  const addOptionValue = (optionId: string) => {
    setOptions(
      options.map((o) => {
        if (o.id === optionId) {
          return {
            ...o,
            values: [...o.values, { id: `val_${Date.now()}`, name: "", color: o.type === "swatch_color" ? "#6a7575" : undefined }],
          };
        }
        return o;
      })
    );
  };

  const removeOptionValue = (optionId: string, valueId: string) => {
    setOptions(
      options.map((o) => {
        if (o.id === optionId) {
          return { ...o, values: o.values.filter((v) => v.id !== valueId) };
        }
        return o;
      })
    );
  };

  const updateOptionValueData = (optionId: string, valueId: string, field: string, value: any) => {
    setOptions(
      options.map((o) => {
        if (o.id === optionId) {
          const updatedValues = o.values.map((v) => {
            if (v.id === valueId) {
              if (field === "image" && value) {
                const file = value as File;
                return { ...v, image: file, imagePreview: URL.createObjectURL(file) };
              }
              if (field === "main_image" && value) {
                const file = value as File;
                return { ...v, main_image: file, mainImagePreview: URL.createObjectURL(file) };
              }
              return { ...v, [field]: value };
            }
            return v;
          });
          return { ...o, values: updatedValues };
        }
        return o;
      })
    );
  };

  const handleVariantTableInput = (id: any, field: string, val: any) => {
    setVariants(prev => prev.map(v => String(v.id) === String(id) ? { ...v, [field]: val } : v));
  };

  return (
    <div className="w-full bg-slate-50/30 p-2 sm:p-6 font-sans text-sm text-slate-700 space-y-10">
      {/* 1. STOCK & SKU SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Stock</label>
          <input
            type="number"
            value={data.stock || ""}
            onChange={(e) => updateData((prev: any) => ({ ...prev, stock: Number(e.target.value) }))}
            className="w-full border border-slate-200 bg-white h-10 px-3 rounded-sm text-xs focus:outline-none focus:border-[#00a896]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            SKU <span className="font-normal text-slate-400">(Product Code)</span>
          </label>
          <div className="flex shadow-2xs rounded-sm">
            <input
              type="text"
              value={data.sku || ""}
              onChange={(e) => updateData((prev: any) => ({ ...prev, sku: e.target.value }))}
              placeholder="e.g. C1W2S3C4V5R6"
              className="w-full border border-r-0 border-slate-200 bg-white h-10 px-3 text-xs focus:outline-none focus:border-[#00a896]"
            />
            <button
              type="button"
              onClick={generateRandomSKU}
              className="bg-slate-100 border border-slate-200 text-slate-600 px-4 text-xs font-semibold hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* 2. PRODUCT PRICE SECTION */}
      <div>
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#00a896] pl-2">Product Price</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Price</label>
            <div className="flex shadow-2xs rounded-sm">
              <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 text-slate-500 text-xs flex items-center">USD ($)</span>
              <input type="number" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} className="w-full border border-slate-200 h-10 px-3 text-xs focus:outline-none focus:border-[#00a896]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Discounted Price</label>
            <div className="flex shadow-2xs rounded-sm">
              <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 text-slate-500 text-xs flex items-center">USD ($)</span>
              <input type="number" value={noDiscount ? price : discountedPrice || ""} disabled={noDiscount} onChange={(e) => setDiscountedPrice(Number(e.target.value))} className="w-full border border-slate-200 h-10 px-3 text-xs focus:outline-none focus:border-[#00a896] disabled:bg-slate-100" />
            </div>
            <label className="flex items-center gap-2 mt-3 text-xs text-slate-600 font-semibold cursor-pointer select-none">
              <input type="checkbox" checked={noDiscount} onChange={(e) => setNoDiscount(e.target.checked)} className="w-4 h-4 accent-[#00a896]" /> No Discount
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Product Based VAT (%)</label>
            <div className="flex shadow-2xs rounded-sm">
              <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 text-slate-500 text-xs flex items-center">%</span>
              <input type="number" value={noVat ? 0 : vatRate || ""} disabled={noVat} onChange={(e) => setVatRate(Number(e.target.value))} className="w-full border border-slate-200 h-10 px-3 text-xs focus:outline-none focus:border-[#00a896] disabled:bg-slate-100" />
            </div>
            <label className="flex items-center gap-2 mt-3 text-xs text-slate-600 font-semibold cursor-pointer select-none">
              <input type="checkbox" checked={noVat} onChange={(e) => setNoVat(e.target.checked)} className="w-4 h-4 accent-[#00a896]" /> No VAT
            </label>
          </div>
        </div>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-sm p-4 text-xs font-bold text-slate-700 space-y-2 max-w-md shadow-2xs">
          <div className="flex justify-between">
            <span>Discount Rate:</span>
            <span className="font-medium">{noDiscount ? "0%" : `${Math.max(0, Math.round(((price - discountedPrice) / (price || 1)) * 100))}%`}</span>
          </div>
          <div className="flex justify-between">
            <span>Commission Rate:</span>
            <span className="font-medium">15%</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-800 font-extrabold text-[13px]">
            <span>You Will Earn (USD):</span>
            <span>${netEarnings > 0 ? netEarnings.toFixed(2) : "0.00"} + VAT</span>
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC PRODUCT OPTIONS */}
      <div>
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-1 border-l-4 border-[#00a896] pl-2">Product Options</h3>
        <p className="text-[11px] text-slate-400 mb-4">Add options like color or size that buyers can choose during checkout</p>

        <div className="space-y-4">
          {options.map((opt) => (
            <div key={opt.id} className="border border-slate-200 rounded-sm p-4 bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-4">
                <GripVertical className="w-5 h-5 text-slate-300 cursor-grab shrink-0" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Option Name</label>
                    <input type="text" value={opt.name} onChange={(e) => updateOptionMeta(opt.id, "name", e.target.value)} className="w-full border border-slate-200 h-9 px-3 rounded-sm text-xs focus:outline-none focus:border-[#00a896]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Option Type</label>
                    <select value={opt.type} onChange={(e) => updateOptionMeta(opt.id, "type", e.target.value as any)} className="w-full border border-slate-200 h-9 px-3 rounded-sm text-xs focus:outline-none bg-white text-slate-700">
                      <option value="dropdown">Dropdown</option>
                      <option value="radio">Radio Buttons</option>
                      <option value="swatch_color">Swatch - Color</option>
                      <option value="swatch_image">Swatch - Image</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => removeProductOption(opt.id)} className="mt-5 border border-slate-200 hover:bg-rose-50 hover:text-rose-500 p-2 rounded-sm text-slate-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="pl-9 space-y-2">
                <label className="block text-[11px] font-bold text-slate-600">Option Values</label>
                <div className="flex flex-wrap gap-3">
                  {opt.values.map((val) => (
                    <div key={val.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-sm">
                      {opt.type === "swatch_color" && (
                        <input
                          type="color"
                          value={val.color || "#6a7575"}
                          onChange={(e) => updateOptionValueData(opt.id, val.id, "color", e.target.value)}
                          className="w-6 h-6 border-0 rounded-xs cursor-pointer bg-transparent shrink-0"
                        />
                      )}

                      {opt.type === "swatch_image" && (
                        <label className="w-7 h-7 border border-slate-300 rounded-xs flex items-center justify-center bg-white hover:border-[#00a896] cursor-pointer overflow-hidden relative group shrink-0">
                          <input type="file" accept="image/*" onChange={(e) => updateOptionValueData(opt.id, val.id, "image", e.target.files?.[0] || null)} className="hidden" />
                          {val.imagePreview ? (
                            <img src={val.imagePreview} alt="swatch" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </label>
                      )}

                      <label className="w-7 h-7 border border-slate-300 rounded-xs flex items-center justify-center bg-white hover:border-[#00a896] cursor-pointer overflow-hidden relative group shrink-0">
                        <input type="file" accept="image/*" onChange={(e) => updateOptionValueData(opt.id, val.id, "main_image", e.target.files?.[0] || null)} className="hidden" />
                        {val.mainImagePreview ? (
                          <img src={val.mainImagePreview} alt="main-val" className="w-full h-full object-cover" />
                        ) : (
                          <div className="relative">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span className="absolute -bottom-1 -right-1 bg-slate-200 rounded-xs text-[7px] px-0.5 border border-white">✏️</span>
                          </div>
                        )}
                      </label>

                      <input type="text" placeholder="Value" value={val.name} onChange={(e) => updateOptionValueData(opt.id, val.id, "name", e.target.value)} className="bg-white border border-slate-200 h-7 px-2 text-xs rounded-xs w-32 focus:outline-none" />
                      <button type="button" onClick={() => removeOptionValue(opt.id, val.id)} className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOptionValue(opt.id)} className="h-8 border border-dashed border-slate-300 hover:border-[#00a896] hover:text-[#00a896] text-slate-500 px-3 rounded-sm flex items-center gap-1 text-xs bg-white cursor-pointer"><Plus className="w-3 h-3" /> Add Value</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addProductOption} className="mt-4 bg-[#00a896] hover:bg-[#009282] text-white text-xs font-semibold px-4 py-2 rounded-sm shadow-xs transition-colors">+ Add Product Option</button>
      </div>

      {/* 4. VARIANTS COMBINATIONS MATRIX TABLE */}
      <div>
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#00a896] pl-2">Variants Combinations</h3>
        <div className="overflow-x-auto border border-slate-200 rounded-sm bg-white mb-4">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-3 w-10 text-center"><input type="checkbox" defaultChecked className="w-3.5 h-3.5" /></th>
                <th className="p-3">Badge preview</th>
                <th className="p-3">Variant Name</th>
                <th className="p-3">SKU Code</th>
                <th className="p-3">Price ($)</th>
                <th className="p-3">Discounted ($)</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Weight (kg)</th>
                <th className="p-3 text-center">Default Variant (Max 1)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {variants.map((item) => {
                const isRowDefault = String(defaultVariantId) === String(item.id);

                return (
                  <tr key={item.id} className={`hover:bg-slate-50/50 ${isRowDefault ? "bg-amber-50/20" : ""}`}>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={item.active}   onChange={(e) => handleVariantTableInput(item.id, "active", e.target.checked)} className="w-3.5 h-3.5 accent-[#00a896]" />
                    </td>
                    <td className="p-3">
                      {item.type === "swatch_color" ? (
                        item.mainImagePreview || item.imagePreview ? (
                          <img src={item.mainImagePreview || item.imagePreview} alt="v-thumb" className="w-6 h-6 object-cover border border-slate-300 rounded-xs" />
                        ) : item.color ? (
                          <div className="w-5 h-5 rounded-xs border border-slate-300" style={{ backgroundColor: item.color }} />
                        ) : (
                          <div className="w-5 h-5 bg-slate-200 rounded-xs flex items-center justify-center text-[10px] text-slate-400">Aa</div>
                        )
                      ) : (item.type === "swatch_image" || item.mainImagePreview) && (item.mainImagePreview || item.imagePreview) ? (
                        <img src={item.mainImagePreview || item.imagePreview} alt="v-thumb" className="w-6 h-6 object-cover border border-slate-300 rounded-xs" />
                      ) : (
                        <div className="w-5 h-5 bg-slate-200 rounded-xs flex items-center justify-center text-[10px] text-slate-400">Aa</div>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{item.name}</td>
                    <td className="p-3">
                      <input type="text" value={item.sku} onChange={(e) => handleVariantTableInput(item.id, "sku", e.target.value)} className="border border-slate-200 bg-white px-2 py-1.5 w-full rounded-sm text-xs font-mono" />
                    </td>
                    <td className="p-3">
  <input
    type="number"
    value={item.price || ""} // 🌟 PAKAI KURUNG KURAWAL, BUKAN TANDA KUTIP
    placeholder={String(price)}
    onChange={(e) => handleVariantTableInput(item.id, "price", e.target.value)}
    className="border border-slate-200 px-2 py-1.5 w-20 rounded-sm focus:outline-none"
  />
</td>
<td className="p-3">
  <input
    type="number"
    value={item.discountedPrice || ""} // 🌟 PAKAI KURUNG KURAWAL
    placeholder={String(noDiscount ? price : discountedPrice)}
    onChange={(e) => handleVariantTableInput(item.id, "discountedPrice", e.target.value)}
    className="border border-slate-200 px-2 py-1.5 w-20 rounded-sm focus:outline-none"
  />
</td>
<td className="p-3">
  <input
    type="number"
    value={item.quantity || ""} // 🌟 PAKAI KURUNG KURAWAL
    placeholder={String(data.stock || 0)}
    onChange={(e) => handleVariantTableInput(item.id, "quantity", e.target.value)}
    className="border border-slate-200 px-2 py-1.5 w-20 rounded-sm focus:outline-none"
  />
</td>
<td className="p-3">
  <input
    type="number"
    value={item.weight || ""} // 🌟 PAKAI KURUNG KURAWAL
    placeholder={String(data.weight || 0.5)}
    onChange={(e) => handleVariantTableInput(item.id, "weight", e.target.value)}
    className="border border-slate-200 px-2 py-1.5 w-20 rounded-sm focus:outline-none"
  />
</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center">
<input 
  type="radio" 
  name="defaultVariantRadio" 
  checked={isRowDefault} 
  onChange={() => {
    const targetId = String(item.id);
    setDefaultVariantId(targetId);
    
    // Paksa perbarui properti is_default di tingkat array lokal detik itu juga
    setVariants(prev => prev.map(v => ({
      ...v,
      is_default: String(v.id) === targetId
    })));
  }} 
  className="w-4 h-4 accent-[#00a896] cursor-pointer" 
/>                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <div onClick={() => !isRowDefault && handleVariantTableInput(item.id, "active", !item.active)} className={`w-9 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${item.active ? "bg-teal-500" : "bg-slate-300"} `}>
                          <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-xs transform transition-transform ${item.active ? "translate-x-3.5" : "translate-x-0"}`} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. DEMO URL */}
      {isDigital && (
        <div>
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-1 border-l-4 border-[#00a896] pl-2">Demo URL</h3>
          <input type="url" placeholder="Demo URL" value={data.demoUrl || ""} onChange={(e) => updateData((prev: any) => ({ ...prev, demoUrl: e.target.value }))} className="w-full border border-slate-200 bg-white h-10 px-4 rounded-sm text-xs text-slate-800 focus:outline-none" />
        </div>
      )}

      {/* 6. PREVIEW MEDIA ASSETS */}
      <div>
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#00a896] pl-2">Preview Media Assets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input type="file" ref={videoInputRef} accept="video/mp4,video/webm" className="hidden" onChange={(e) => { setVideoName(e.target.files?.[0]?.name || ""); updateData((prev: any) => ({ ...prev, videoPreview: e.target.files?.[0] })); }} />
          <input type="file" ref={audioInputRef} accept="audio/mp3,audio/wav" className="hidden" onChange={(e) => { setAudioName(e.target.files?.[0]?.name || ""); updateData((prev: any) => ({ ...prev, audioPreview: e.target.files?.[0] })); }} />

          <div onClick={() => videoInputRef.current?.click()} className="border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-[#00a896] rounded-sm p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
            <Video className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-xs text-slate-500 font-medium">Video Preview (MP4 / WEBM)</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">{videoName ? `Selected: ${videoName}` : "Drag and drop file here or Browse Files"}</p>
          </div>

          <div onClick={() => audioInputRef.current?.click()} className="border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-[#00a896] rounded-sm p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
            <Music className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-xs text-slate-500 font-medium">Audio Preview (MP3 / WAV)</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">{audioName ? `Selected: ${audioName}` : "Drag and drop file here or Browse Files"}</p>
          </div>
        </div>
      </div>

      {/* 7. DYNAMIC API LOCATION SECTION */}
      <div>
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-1 border-l-4 border-[#00a896] pl-2">Product Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <select
            value={selectedCountry.iso2}
            onChange={(e) => {
              const opt = e.target.options[e.target.selectedIndex];
              setSelectedCountry({ iso2: e.target.value, name: opt.text });
              updateData((prev: any) => ({ ...prev, country: opt.text }));
            }}
            className="border border-slate-200 h-10 px-3 rounded-sm text-xs bg-white text-slate-700 cursor-pointer"
          >
            <option value="">Select Country</option>
            {countries.map(c => <option key={c.id} value={c.iso2}>{c.name}</option>)}
          </select>

          <select
            value={selectedState.iso2}
            disabled={!selectedCountry.iso2 || loadingStates}
            onChange={(e) => {
              const opt = e.target.options[e.target.selectedIndex];
              setSelectedState({ iso2: e.target.value, name: opt.text });
              updateData((prev: any) => ({ ...prev, state: opt.text }));
            }}
            className="border border-slate-200 h-10 px-3 rounded-sm text-xs bg-white text-slate-700 cursor-pointer disabled:bg-slate-100"
          >
            <option value="">{loadingStates ? "Loading..." : "Select State"}</option>
            {states.map(s => <option key={s.id} value={s.iso2}>{s.name}</option>)}
          </select>

          <select
            value={selectedCity}
            disabled={!selectedState.iso2 || loadingCities}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              updateData((prev: any) => ({ ...prev, cityId: e.target.value }));
            }}
            className="border border-slate-200 h-10 px-3 rounded-sm text-xs bg-white text-slate-700 cursor-pointer disabled:bg-slate-100"
          >
            <option value="">{loadingCities ? "Loading..." : "Select City"}</option>
            {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          <input type="text" placeholder="Address Line" value={data.address || ""} onChange={(e) => updateData((prev: any) => ({ ...prev, address: e.target.value }))} className="border border-slate-200 h-10 px-3 rounded-sm text-xs text-slate-800 focus:outline-none focus:border-[#00a896]" />
          <input type="text" placeholder="Zip Code" value={data.zipCode || ""} onChange={(e) => updateData((prev: any) => ({ ...prev, zipCode: e.target.value }))} className="border border-slate-200 h-10 px-3 rounded-sm text-xs text-slate-800 focus:outline-none focus:border-[#00a896]" />
        </div>
      </div>

      {/* 8. SHIPPING LOGISTICS */}
      {isPhysical && (
        <div className="border-t border-slate-200 pt-8">
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#00a896] pl-2">Shipping Logistics (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Weight (kg)</label>
              <input type="number" value={data.weight || ""} onChange={(e) => updateData((prev: any) => ({ ...prev, weight: Number(e.target.value) }))} className="w-full border border-slate-200 bg-white h-10 px-3 rounded-sm text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Dimensions (L / W / H) (cm)</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="L" value={data.length || ""} onChange={(e) => updateData((prev: any) => ({ ...prev, length: Number(e.target.value) }))} className="border border-slate-200 h-10 px-3 rounded-sm text-xs text-center" />
                <input type="number" placeholder="W" value={data.width || ""} onChange={(e) => updateData((prev: any) => ({ ...prev, width: Number(e.target.value) }))} className="border border-slate-200 h-10 px-3 rounded-sm text-xs text-center" />
                <input type="number" placeholder="H" value={data.height || ""} onChange={(e) => updateData((prev: any) => ({ ...prev, height: Number(e.target.value) }))} className="border border-slate-200 h-10 px-3 rounded-sm text-xs text-center" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-sm">
              Calculated Shipping Weight: {data.weight || "0.000"} kg
            </span>
          </div>
          <div className="mt-6 md:w-1/3">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Delivery Estimated Time</label>
            <select
              value={data.deliveryTime || ""}
              onChange={(e) => updateData((prev: any) => ({ ...prev, deliveryTime: e.target.value }))}
              className="w-full border border-slate-200 h-10 px-3 rounded-sm text-xs text-slate-600 focus:outline-none bg-white cursor-pointer"
            >
              <option value="">Select Packing Speed</option>
              <option value="1-2">1-2 Business Days</option>
              <option value="3-5">3-5 Business Days</option>
              <option value="7-10">7-10 Business Days</option>
              <option value="Custom">Custom Shipping Agreement</option>
            </select>
          </div>
        </div>
      )}

      {/* 9. FOOTER ACTIONS */}
      <div className="border-t border-slate-200 pt-6 flex flex-col space-y-4">
        <div className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            id="terms"
            className="border border-slate-200 w-4 h-4 rounded-xs transition-colors accent-[#00a896] cursor-pointer"
            checked={!!data.agreeTerms}
            onChange={(e) => updateData((prev: any) => ({ ...prev, agreeTerms: e.target.checked }))}
          />
          <label htmlFor="terms" className="text-xs text-gray-500 cursor-pointer select-none">
            I have read and agree to the <Link href="/terms" className="text-gray-700 underline font-medium hover:text-[#00a896]">Terms & Conditions</Link>
          </label>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onBack}
            className="bg-[#333333] hover:bg-black text-white px-5 h-10 text-xs font-semibold rounded-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!data.agreeTerms}
            className="bg-[#00a896] hover:bg-[#009282] text-white px-6 h-10 text-xs font-bold rounded-sm flex items-center gap-2 transition-colors shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" /> Save Changes & Publish
          </button>
        </div>
      </div>
    </div>
  );
}
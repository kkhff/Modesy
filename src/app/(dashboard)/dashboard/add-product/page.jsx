"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// Komponen Step 1 (General Information)
import StepOne from "@/components/dashboard/add-product/StepOne";
// Komponen Step 2 (Details & Variations)
import StepTwo from "@/components/dashboard/add-product/StepTwo";
// Server Action
import { createProductAction } from "./action";

export default function AddProductPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Object state tunggal untuk menampung seluruh input form lengkap
  const [formData, setFormData] = useState({
    // Step 1 data
    images: [],
    productType: "physical", // physical | digital
    listingType: "sale",     // sale | ordinary | quote | license
    category: "",
    brand: "",
    externalLink: "",
    titleEn: "",
    descEn: "",
    titleId: "",
    descId: "",
    sku: "",

    country: "",
    state: "",
    cityId: "",
    address: "",
    zipCode: "",
    // Step 2 data
    price: 0,
    discountRate: 0,
    vatRate: 0,
    stock: 1,
    options: [],    // 🌟 1. TAMBAHKAN HIERARKI STATE UTAMA UNTUK FILTER OPTIONS SWATCH DI SINI
    variations: [], // Menyimpan data warna/ukuran nullable pendukung e-commerce
    regularLicensePrice: 0,
    extendedLicensePrice: 0,
  });

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  // Handler Submit Utama Berbasis FormData untuk integrasi ke Server Action
  const handleSubmitAll = async () => {
    // 1. JALANKAN GERBANG VALIDASI (Hanya field yang required)
    if (!formData.images || formData.images.length === 0) {
      toast.error("Wajib mengunggah minimal 1 gambar produk!");
      return;
    }
    if (!formData.category) {
      toast.error("Silakan pilih Kategori produk terlebih dahulu!");
      return;
    }
    if (!formData.titleEn || !formData.titleEn.trim()) {
      toast.error("Judul versi bahasa Inggris (Title English) wajib diisi!");
      return;
    }
    if (Number(formData.price) <= 0) {
      toast.error("Harga produk harus lebih besar dari 0 USD!");
      return;
    }
    if (Number(formData.stock) < 1) {
      toast.error("Stok minimal untuk produk baru adalah 1!");
      return;
    }

    // 2. KALAU LOLOS, BARU PROSES FORMDATA & TEMBAK ACTION
    setLoading(true);
    const serverFormData = new FormData();

    if (formData.images && formData.images.length > 0) {
      formData.images.forEach((file) => {
        serverFormData.append("images", file);
      });
    }

    if (formData.videoPreview) serverFormData.append("videoPreview", formData.videoPreview);
    if (formData.audioPreview) serverFormData.append("audioPreview", formData.audioPreview);
    if (formData.digitalFile) serverFormData.append("digitalFile", formData.digitalFile);
    
    serverFormData.append("demoUrl", formData.demoUrl || "");
    serverFormData.append("weight", String(formData.weight || 0));
    serverFormData.append("length", String(formData.length || 0));
    serverFormData.append("width", String(formData.width || 0));
    serverFormData.append("height", String(formData.height || 0));
    serverFormData.append("deliveryTime", formData.deliveryTime || "");

    serverFormData.append("productType", formData.productType);
    serverFormData.append("listingType", formData.listingType);
    serverFormData.append("category", formData.category);
    serverFormData.append("brand", formData.brand);
    serverFormData.append("externalLink", formData.externalLink);
    serverFormData.append("titleEn", formData.titleEn);
    serverFormData.append("titleId", formData.titleId);
    serverFormData.append("descEn", formData.descEn);
    serverFormData.append("descId", formData.descId);
    serverFormData.append("sku", formData.sku);
    
    serverFormData.append("country", formData.country || "");
    serverFormData.append("state", formData.state || "");
    serverFormData.append("cityId", formData.cityId || "");
    serverFormData.append("address", formData.address || "");
    serverFormData.append("zipCode", formData.zipCode || "");

    serverFormData.append("discountedPrice", String(formData.discountedPrice));
    serverFormData.append("price", String(formData.price));
    serverFormData.append("discountRate", String(formData.discountRate));
    serverFormData.append("vatRate", String(formData.vatRate));
    serverFormData.append("stock", String(formData.stock));
    serverFormData.append("regularLicensePrice", String(formData.regularLicensePrice));
    serverFormData.append("extendedLicensePrice", String(formData.extendedLicensePrice));
    
    // DATA DIKIRIM KE ACTION BACKEND
    serverFormData.append("variations", JSON.stringify(formData.variations));
    // 🌟 2. KUNCINYA DI SINI: Append data options yang bertipe string JSON agar dibaca backend server action
    serverFormData.append("options", JSON.stringify(formData.options)); 

    try {
      const result = await createProductAction(serverFormData);

      if (result.success) {
        toast.success("Mantap! Produk berhasil diterbitkan.");
        router.push("/dashboard/products");
      } else {
        toast.error(`Gagal: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan koneksi ke server action.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mx-auto py-8">
      {/* Step Indicator (Progress Bar) */}
      <div className="flex items-center justify-center mb-8">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 1 ? "bg-[#00a896] text-white" : "bg-gray-200"}`}>
          {step > 1 ? <Check className="w-5 h-5" /> : "1"}
        </div>
        <div className={`w-32 h-1 ${step >= 2 ? "bg-[#00a896]" : "bg-gray-200"}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 2 ? "bg-[#00a896] text-white" : "bg-gray-200"}`}>
          2
        </div>
      </div>

      {/* Render Komponen Berdasarkan Step */}
      <div className="bg-white p-6 shadow-sm border border-gray-100 rounded-sm relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50 font-bold text-slate-700 text-xs">
            Sedang memproses dan mengunggah produk...
          </div>
        )}
        
        {step === 1 ? (
          <StepOne 
            data={formData} 
            updateData={setFormData} 
            onNext={handleNext} 
          />
        ) : (
          <StepTwo 
            data={formData} 
            updateData={setFormData} 
            onBack={handleBack} 
            onSubmit={handleSubmitAll}
          />
        )}
      </div>
    </div>
  );
}
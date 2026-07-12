"use client";

import React, { useState, useTransition } from "react";
import StepOne from "@/components/dashboard/add-product/StepOne"; 
import StepTwo from "@/components/dashboard/add-product/StepTwo"; 
import { updateProductAction } from "./editAction"; 
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

interface EditFormWrapperProps {
  initialData: any;
}

// --- FUNGSI PARSER HIBRIDA PINTAR (MENJAGA REFERENSI ID DATABASE ASLI) ---
function parseExistingVariationsToOptions(variations: any[], variationOptionsBlueprint: any[]): any[] {
  if (!variations || variations.length === 0) {
    return [{ id: "opt_1", name: "Color", type: "swatch_color", values: [] }];
  }

  const firstVariant = variations[0];
  if (!firstVariant.name || firstVariant.name === "Default") {
    return [{ id: "opt_1", name: "Color", type: "swatch_color", values: [] }];
  }

  // Pecah nama kombinasi variasi database untuk tahu ada berapa opsi terdaftar
  const detectedValuesFromDb = firstVariant.name.split(",").map((s: string) => s.trim());
  const structureLength = detectedValuesFromDb.length;

  // 1. Petakan nama & tipe opsi berdasarkan objek blueprint variation_options di database
  const parsedOptions = Array.from({ length: structureLength }).map((_, idx) => {
    let optionName = idx === 0 ? "Color" : "Size";
    let optionType: "dropdown" | "radio" | "swatch_color" | "swatch_image" = "dropdown";

    if (variationOptionsBlueprint && variationOptionsBlueprint[idx]) {
      const blueprintItem = variationOptionsBlueprint[idx];
      if (typeof blueprintItem === "object" && blueprintItem !== null) {
        optionName = blueprintItem.name || optionName;
        optionType = blueprintItem.type || optionType;
        
        return {
          id: `opt_existing_${idx}`,
          name: optionName,
          type: optionType,
          values: [] as any[]
        };
      } else {
        optionName = String(blueprintItem);
      }
    }

    // Fallback tebak tipe jika data produk lama tipenya belum tersimpan detail
    const hasAnyImage = variations.some(v => v.variant_image_url && v.variant_image_url.trim() !== "");
    const hasAnyColor = variations.some(v => v.color && v.color.trim() !== "" && v.color !== "#ffffff" && v.color !== "NULL");

    if (idx === 0) {
      if (hasAnyImage) optionType = "swatch_image";
      else if (hasAnyColor) optionType = "swatch_color";
    } else {
      if (optionName.toLowerCase().includes("size") || optionName.toLowerCase().includes("ukuran")) {
        optionType = "radio";
      }
    }

    return {
      id: `opt_existing_${idx}`,
      name: optionName, 
      type: optionType,
      values: [] as any[]
    };
  });

  // 2. Ekstrak baris value dari matrix variations tanpa duplikasi
  variations.forEach((v) => {
    if (!v.name) return;
    const valuesArray = v.name.split(",").map((s: string) => s.trim());
    
    valuesArray.forEach((valName: string, idx: number) => {
      if (!parsedOptions[idx]) return;
      
      const isValueExists = parsedOptions[idx].values.some((el: any) => el.name === valName);
      
      if (!isValueExists && valName !== "") {
        const hasImage = v.variant_image_url || null;
        const hasColor = v.color || "#ffffff";

        parsedOptions[idx].values.push({
          // KUNCI UTAMA: Pertahankan v.id asli number Supabase agar tidak menjadi hash string acak!
          id: v.id ? Number(v.id) : `val_existing_${idx}_${Math.random().toString(36).substr(2, 5)}`,
          name: valName,
          color: parsedOptions[idx].type === "swatch_color" ? hasColor : undefined,
          imagePreview: hasImage || undefined,
          mainImagePreview: hasImage || undefined
        });
      }
    });
  });

  return parsedOptions;
}

export default function EditFormWrapper({ initialData }: EditFormWrapperProps) {
  const [step, setStep] = useState(1);
  const router = useRouter();
  
  // Set global form data state beserta options hasil parse ter-hydrated
  const [formData, setFormData] = useState(() => {
    const populatedOptions = parseExistingVariationsToOptions(
      initialData.variations, 
      initialData.variation_options
    );
    return {
      ...initialData,
      options: populatedOptions,
    };
  });

  const [isPending, startTransition] = useTransition();

  const handleNextStep = () => setStep(2);
  const handleBackStep = () => setStep(1);
  
  const handleSaveChangesSubmit = async () => {
    Swal.fire({
      title: "Save Changes?",
      text: "Are you sure you want to update this product listing?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#00a896",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Update It!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: "Updating Product...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
          const dataPayload = new FormData();
          
          // Kirim blueprint nama dan tipe opsi saat ini ke JSONB database
          const optionBlueprint = formData.options.map((opt: any) => ({
            name: opt.name,
            type: opt.type
          }));
          dataPayload.append("variationOptions", JSON.stringify(optionBlueprint));
          dataPayload.append("discountedPrice", formData.discountedPrice !== undefined ? String(formData.discountedPrice) : "");

          dataPayload.append("country", formData.country || "");
          dataPayload.append("state", formData.state || "");
          dataPayload.append("cityId", formData.cityId || "");
          dataPayload.append("address", formData.address || "");
          dataPayload.append("zipCode", formData.zipCode || "");

          // Kemas seluruh field form data lainnya ke FormData
          Object.keys(formData).forEach((key) => {
            if (key === "images") {
              formData.images.forEach((file: File) => dataPayload.append("images", file));
            } else if (key === "existingImages" || key === "variations") {
              dataPayload.append(key, JSON.stringify(formData[key]));
            } else if (
              key !== "options" && 
              key !== "variation_options" &&
              !["country", "state", "cityId", "address","discountedPrice", "zipCode"].includes(key) // Jangan di-append dobel
            ) { 
              dataPayload.append(key, formData[key]);
            }
          });

          const response = await updateProductAction(dataPayload);
          Swal.close();

          if (response.success) {
            Swal.fire({
              title: "Updated Successfully!",
              text: "Your product changes have been live.",
              icon: "success",
              timer: 1500,
              showConfirmButton: false,
            }).then(() => {
              router.push("/dashboard/products");
              router.refresh();
            });
          } else {
            Swal.fire("Error!", response.error || "Failed to update product.", "error");
          }
        } catch (err: any) {
          Swal.fire("Error!", err.message || "An unexpected error occurred.", "error");
        }
      }
    });
  };

  return (
    <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
      {/* Indikator Navigasi Tab */}
      <div className="flex items-center justify-center gap-6 mb-8 border-b border-slate-100 pb-4 select-none">
        <div onClick={() => setStep(1)} className={`cursor-pointer flex items-center gap-2 text-xs font-bold ${step === 1 ? "text-[#00a896]" : "text-slate-400"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${step === 1 ? "bg-[#00a896] text-white border-[#00a896]" : "border-slate-300"}`}>1</span>
          Product Details
        </div>
        <div className="w-12 h-px bg-slate-200" />
        <div onClick={() => formData.titleEn && handleNextStep()} className={`flex items-center gap-2 text-xs font-bold ${step === 2 ? "text-[#00a896]" : "text-slate-400"} ${!formData.titleEn ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${step === 2 ? "bg-[#00a896] text-white border-[#00a896]" : "border-slate-300"}`}>2</span>
          Options & Variations
        </div>
      </div>

      {/* Render Multi-Step Form */}
      {step === 1 && (
        <StepOne data={formData} updateData={setFormData} onNext={handleNextStep} />
      )}
      {step === 2 && (
        <StepTwo data={formData} updateData={setFormData} onBack={handleBackStep} onSubmit={handleSaveChangesSubmit} />
      )}
    </div>
  );
}
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { DateTimePicker } from "../ui/time-picker";
import { saveCouponAction } from "@/app/(dashboard)/dashboard/coupons/action";

interface CouponFormProps {
  initialData?: any; // Jika diisi, otomatis masuk ke mode EDIT
  couponId?: string;
}

export default function CouponForm({ initialData, couponId }: CouponFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form states dengan data awal dinamis (Add/Edit)
  const [couponCode, setCouponCode] = useState(initialData?.coupon_code || "");
  const [discountRate, setDiscountRate] = useState(initialData?.discount_rate || "");
  const [numberOfCoupons, setNumberOfCoupons] = useState(initialData?.number_of_coupons || "");
  const [minOrder, setMinOrder] = useState(initialData?.minimum_order_amount || "0");
  const [usageType, setUsageType] = useState<"single" | "multiple">(initialData?.usage_type || "single");
  const [isPublic, setIsPublic] = useState<boolean>(initialData?.is_public !== false); // default true

  // Format tanggal untuk input datetime-local
  const getDefaultExpiryDate = () => {
    if (initialData?.expiry_date) {
      const date = new Date(initialData.expiry_date);
      // Geser waktu berdasarkan timezone offset komputer user
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = new Date(date.getTime() - offset).toISOString();
      return localISOTime.slice(0, 16); // Menghasilkan 'YYYY-MM-DDTHH:mm' yang valid
    }
    // Jika dalam mode ADD (tambah baru), kita kasih default waktu hari ini + 7 hari ke depan biar user ga kosong
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().slice(0, 16);
  };
  const [expiryDate, setExpiryDate] = useState(getDefaultExpiryDate());

  // Fungsi generator kode kupon acak khas Modesy
  const handleGenerateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCouponCode(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!couponCode.trim()) return toast.error("Coupon code is required.");
    if (!discountRate || Number(discountRate) <= 0 || Number(discountRate) > 100) {
      return toast.error("Please enter a valid discount rate (1% - 100%).");
    }
    if (!numberOfCoupons || Number(numberOfCoupons) <= 0) {
      return toast.error("Please specify a valid number of coupons.");
    }
    if (!expiryDate) return toast.error("Please select an expiry date.");

    setSubmitting(true);
    const loadingToast = toast.loading(couponId ? "Updating coupon..." : "Creating coupon...");

    const payload = {
      coupon_code: couponCode,
      discount_rate: discountRate,
      number_of_coupons: numberOfCoupons,
      minimum_order_amount: minOrder,
      usage_type: usageType,
      is_public: isPublic,
      expiry_date: expiryDate
    };

    try {
      const res = await saveCouponAction(payload, couponId);
      toast.dismiss(loadingToast);

      if (res.success) {
        toast.success(couponId ? "Coupon updated successfully!" : "Coupon created successfully!");
        router.push("/dashboard/coupons");
        router.refresh();
      } else {
        toast.error(res.error || "Something went wrong.");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full bg-white border border-gray-200/80 rounded-sm p-6 space-y-5 text-xs text-slate-600 font-sans shadow-xs">
      
      {/* 1. INPUT KODE KUPON (FULL WIDTH) */}
      <div className="space-y-1.5 w-full">
        <label className="font-bold text-slate-700">Coupon Code <span className="text-slate-400 font-normal">(Do not use special characters E.g: #, *, % ..)</span></label>
        <div className="flex gap-2 w-full">
          <input
            type="text"
            placeholder="Coupon Code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))} 
            disabled={submitting}
            className="flex-1 h-9 px-3 border border-gray-200 rounded-sm focus:border-[#00a896] focus:outline-hidden font-bold text-slate-800 tracking-wider uppercase placeholder:text-gray-300"
          />
          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={submitting}
            className="h-9 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold rounded-sm border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Generate
          </button>
        </div>
      </div>

      {/* 2. RATE DISKON (%) (FULL WIDTH) */}
      <div className="space-y-1.5 w-full">
        <label className="font-bold text-slate-700">Discount Rate</label>
        <div className="relative flex items-center w-full">
          <span className="absolute left-3 font-bold text-slate-400 border-r border-gray-200 pr-2.5">%</span>
          <input
            type="number"
            min="1"
            max="100"
            placeholder="E.g: 10"
            value={discountRate}
            onChange={(e) => setDiscountRate(e.target.value)}
            disabled={submitting}
            className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-sm focus:border-[#00a896] focus:outline-hidden font-semibold text-slate-800"
          />
        </div>
      </div>

      {/* 3. JUMLAH MAKSIMAL KUPON (FULL WIDTH) */}
      <div className="space-y-1.5 w-full">
        <label className="font-bold text-slate-700">Number of Coupons <span className="text-slate-400 font-normal">(How many times a coupon can be used by all customers before being invalid)</span></label>
        <input
          type="number"
          min="1"
          placeholder="E.g: 100"
          value={numberOfCoupons}
          onChange={(e) => setNumberOfCoupons(e.target.value)}
          disabled={submitting}
          className="w-full h-9 px-3 border border-gray-200 rounded-sm focus:border-[#00a896] focus:outline-hidden font-semibold text-slate-800"
        />
      </div>

      {/* 4. MINIMAL BELANJA (FULL WIDTH) */}
      <div className="space-y-1.5 w-full">
        <label className="font-bold text-slate-700">Minimum order amount <span className="text-slate-400 font-normal">(Minimum cart total needed to use the coupon)</span></label>
        <div className="relative flex items-center w-full">
          <span className="absolute left-3 font-semibold text-slate-400 border-r border-gray-200 pr-2.5">USD ($)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            disabled={submitting}
            className="w-full h-9 pl-16 pr-3 border border-gray-200 rounded-sm focus:border-[#00a896] focus:outline-hidden font-semibold text-slate-800"
          />
        </div>
      </div>

      {/* 5. TIPE PENGGUNAAN KUPON */}
      <div className="space-y-2 w-full">
        <label className="font-bold text-slate-700 block">Coupon Usage Type</label>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600">
            <input
              type="radio"
              name="usage_type"
              checked={usageType === "single"}
              onChange={() => setUsageType("single")}
              disabled={submitting}
              className="w-4 h-4 text-[#00a896] focus:ring-[#00a896] border-gray-300 cursor-pointer"
            />
            Each user can use it for only one order
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600">
            <input
              type="radio"
              name="usage_type"
              checked={usageType === "multiple"}
              onChange={() => setUsageType("multiple")}
              disabled={submitting}
              className="w-4 h-4 text-[#00a896] focus:ring-[#00a896] border-gray-300 cursor-pointer"
            />
            Each user can use it for multiple orders <span className="text-slate-400 font-normal">(Guests can use)</span>
          </label>
        </div>
      </div>

      {/* 6. STATUS KUPON PUBLIK */}
      <div className="space-y-2 w-full">
        <label className="font-bold text-slate-700 block">Public Coupon <span className="text-slate-400 font-normal">(Public coupons are visible to all users)</span></label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600">
            <input
              type="radio"
              name="is_public"
              checked={isPublic === true}
              onChange={() => setIsPublic(true)}
              disabled={submitting}
              className="w-4 h-4 text-[#00a896] focus:ring-[#00a896] cursor-pointer"
            />
            Yes
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600">
            <input
              type="radio"
              name="is_public"
              checked={isPublic === false}
              onChange={() => setIsPublic(false)}
              disabled={submitting}
              className="w-4 h-4 text-[#00a896] focus:ring-[#00a896] cursor-pointer"
            />
            No
          </label>
        </div>
      </div>

      {/* 7. EXPIRY DATE (MENGGUNAKAN SHADCN DATE TIME PICKER) */}
      {/* 7. EXPIRY DATE (MENGGUNAKAN SCROLLABLE SHADCN DATETIME PICKER) */}
      <div className="space-y-1.5 w-full font-sans">
        <label className="font-bold text-slate-700">Expiry Date</label>
        <div className="w-full max-w-md">
          <DateTimePicker 
            value={expiryDate} 
            onChange={(val) => setExpiryDate(val)} 
            disabled={submitting} 
          />
        </div>
      </div>

      {/* BUTTON SUBMIT */}
      <div className="flex justify-end pt-3 border-t border-gray-100 w-full">
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-6 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 text-xs shadow-xs"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
            </>
          ) : (
            couponId ? "Save Changes" : "Add Coupon"
          )}
        </button>
      </div>

    </form>
  );
}
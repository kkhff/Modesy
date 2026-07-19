"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { createClient } from "@/lib/supabase/client";
import { upsertPayoutAccountAction } from "./action";

type SubTab = "paypal" | "iban" | "swift";

export default function SetPayoutAccountPage() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("paypal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form States untuk masing-masing tipe akun
  const [paypalEmail, setPaypalEmail] = useState("");

  const [ibanName, setIbanName] = useState("");
  const [ibanBank, setIbanBank] = useState("");
  const [ibanBranch, setIbanBranch] = useState("");
  const [ibanAccount, setIbanAccount] = useState("");

  const [swiftName, setSwiftName] = useState("");
  const [swiftBank, setSwiftBank] = useState("");
  const [swiftBranch, setSwiftBranch] = useState("");
  const [swiftAccount, setSwiftAccount] = useState("");
  const [swiftIban, setSwiftIban] = useState("");
  const [swiftCode, setSwiftCode] = useState("");

  const supabase = createClient();

  // 1. Fetch data yang sudah pernah disimpan user sebelumnya
  useEffect(() => {
    const loadAccountData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("user_payout_accounts")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setPaypalEmail(data.paypal_email || "");
          
          setIbanName(data.iban_payout_name || "");
          setIbanBank(data.iban_payout_bank_name || "");
          setIbanBranch(data.iban_payout_branch_number || "");
          setIbanAccount(data.iban_payout_account_number || "");

          setSwiftName(data.swift_payout_name || "");
          setSwiftBank(data.swift_payout_bank_name || "");
          setSwiftBranch(data.swift_payout_branch_number || "");
          setSwiftAccount(data.swift_payout_account_number || "");
          setSwiftIban(data.swift_payout_iban || "");
          setSwiftCode(data.swift_payout_code || "");
        }
      } catch (err) {
        console.error("Error loading payout account details:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAccountData();
  }, []);

  // 2. Handler Pemicu Simpan Perubahan Form
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();

    // Buat payload dinamis sesuai sub-tab aktif
    let payload: any = {};
    if (activeSubTab === "paypal") {
      if (paypalEmail && !paypalEmail.includes("@")) {
        toast.error("Please enter a valid PayPal email address.");
        return;
      }
      payload = { paypal_email: paypalEmail };
    } else if (activeSubTab === "iban") {
      payload = {
        iban_payout_name: ibanName,
        iban_payout_bank_name: ibanBank,
        iban_payout_branch_number: ibanBranch,
        iban_payout_account_number: ibanAccount,
      };
    } else if (activeSubTab === "swift") {
      payload = {
        swift_payout_name: swiftName,
        swift_payout_bank_name: swiftBank,
        swift_payout_branch_number: swiftBranch,
        swift_payout_account_number: swiftAccount,
        swift_payout_iban: swiftIban,
        swift_payout_code: swiftCode,
      };
    }

    // CEGAT PAKE SWAL FIRE BIAR MANTAP
    Swal.fire({
      title: "Save Account Changes?",
      text: `Are you sure you want to update your ${activeSubTab.toUpperCase()} payout account details?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#00a896",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Save It!",
      cancelButtonText: "Cancel",
      customClass: { popup: "rounded-sm text-sm font-sans" }
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      setSaving(true);
      const loadingToast = toast.loading("Saving changes...");

      try {
        const res = await upsertPayoutAccountAction(payload);
        toast.dismiss(loadingToast);

        if (res.success) {
          Swal.fire({
            title: "Success!",
            text: "Payout account settings updated successfully.",
            icon: "success",
            confirmButtonColor: "#00a896",
            customClass: { popup: "rounded-sm text-sm font-sans" }
          });
        } else {
          toast.error(res.error || "Failed to update account.");
        }
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("An unexpected error occurred.");
      } finally {
        setSaving(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="w-full text-center py-20 font-sans text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#00a896]" /> Loading account details...
      </div>
    );
  }

  return (
    <div className="w-full font-sans antialiased text-xs text-slate-600 space-y-5">
      
      {/* ATAS: SUB-NAVIGASI TOMBOL TABS */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2 select-none">
        {(["paypal", "iban", "swift"] as SubTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveSubTab(tab)}
            className={`h-7 px-4 font-bold rounded-xs uppercase transition-all cursor-pointer ${
              activeSubTab === tab
                ? "bg-[#00a896] text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200/80"
            }`}
          >
            {tab === "paypal" ? "PayPal" : tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* BAWAH: LAYOUT KONTEN INPUT FORM */}
      <form onSubmit={handleSaveChanges} className="bg-white border border-gray-100 rounded-sm p-6 space-y-4 max-w-3xl">
        
        {/* VIEW SUB-TAB A: PAYPAL */}
        {activeSubTab === "paypal" && (
          <div className="space-y-1.5 animate-fade-in">
            <label className="font-bold text-slate-700">PayPal Email Address *</label>
            <input
              type="text"
              placeholder="email@example.com"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              disabled={saving}
              className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 transition-all placeholder:text-gray-300"
            />
          </div>
        )}

        {/* VIEW SUB-TAB B: IBAN */}
        {activeSubTab === "iban" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 anonymity-fade-in">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Account Holder Name *</label>
              <input type="text" value={ibanName} onChange={(e) => setIbanName(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Bank Name *</label>
              <input type="text" value={ibanBank} onChange={(e) => setIbanBank(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Branch Number</label>
              <input type="text" value={ibanBranch} onChange={(e) => setIbanBranch(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">IBAN / Account Number *</label>
              <input type="text" value={ibanAccount} onChange={(e) => setIbanAccount(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
          </div>
        )}

        {/* VIEW SUB-TAB C: SWIFT */}
        {activeSubTab === "swift" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 anonymity-fade-in">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Account Holder Name *</label>
              <input type="text" value={swiftName} onChange={(e) => setSwiftName(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Bank Name *</label>
              <input type="text" value={swiftBank} onChange={(e) => setSwiftBank(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Branch Number</label>
              <input type="text" value={swiftBranch} onChange={(e) => setSwiftBranch(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Account Number *</label>
              <input type="text" value={swiftAccount} onChange={(e) => setSwiftAccount(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">IBAN</label>
              <input type="text" value={swiftIban} onChange={(e) => setSwiftIban(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">SWIFT / BIC Code *</label>
              <input type="text" value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} disabled={saving} className="w-full h-9 px-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 text-xs" />
            </div>
          </div>
        )}

        {/* SEKSI SUBMIT ACTION */}
        <div className="flex justify-end pt-3 border-t border-gray-50">
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-5 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 text-xs shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Save Changes
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
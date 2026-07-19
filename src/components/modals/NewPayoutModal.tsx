"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { createPayoutRequestAction } from "@/app/(marketplace)/(account)/wallet/payouts/action";

interface NewPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: () => void;
}

export default function NewPayoutModal({ isOpen, onClose, currentBalance, onSuccess }: NewPayoutModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("PayPal");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);

    if (!amount || numericAmount <= 0) {
      toast.error("Please enter a valid withdrawal amount.");
      return;
    }

    if (numericAmount < 100) {
      toast.error("Minimum withdrawal amount is $100.");
      return;
    }

    if (numericAmount > currentBalance) {
      toast.error("Insufficient wallet balance.");
      return;
    }

    // 🌟 CEGATAN DENGAN SWAL FIRE SEBELUM KIRIM
    Swal.fire({
      title: "Submit Payout Request?",
      text: `Are you sure you want to request a withdrawal of $${numericAmount.toFixed(2)} USD via ${method}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#00a896",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Submit Request!",
      cancelButtonText: "Cancel",
      customClass: { popup: "rounded-sm text-sm font-sans" }
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      setSubmitting(true);
      const loadingToast = toast.loading("Submitting request to admin...");

      try {
        const res = await createPayoutRequestAction({ amount: numericAmount, method });
        toast.dismiss(loadingToast);

        if (res.success) {
          Swal.fire({
            title: "Request Submitted!",
            text: "Your payout request has been recorded and is waiting for administrator approval.",
            icon: "success",
            confirmButtonColor: "#00a896",
            customClass: { popup: "rounded-sm text-sm font-sans" }
          });
          setAmount("");
          onSuccess();
          onClose();
        } else {
          toast.error(res.error || "Failed to submit request.");
        }
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Something went wrong.");
      } finally {
        setSubmitting(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in font-sans text-xs antialiased text-slate-600">
      <div className="bg-white border border-gray-200 shadow-2xl rounded-xs w-full max-w-md overflow-hidden relative animate-scale-in">
        
        {/* HEADER MODAL */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 w-full text-center pl-4">New Payout Request</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY FORM */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* INPUT NOMINAL */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Withdrawal Amount</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 font-semibold text-slate-400 border-r border-gray-200 pr-2.5">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-xs focus:border-[#00a896] outline-hidden font-medium text-slate-800 transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* METODE PENARIKAN */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Withdrawal Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={submitting}
              className="w-full h-9 px-2 border border-gray-200 rounded-xs bg-white focus:border-[#00a896] outline-hidden font-medium text-slate-800 transition-all"
            >
              <option value="PayPal">PayPal</option>
              <option value="Bank Transfer (IBAN)">Bank Transfer (IBAN)</option>
              <option value="SWIFT">SWIFT</option>
            </select>
          </div>

          {/* BUTTON SUBMIT */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="h-8 px-5 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>

          {/* INFORMASI SYARAT ATURAN (Bawaan Screenshot Modesy) */}
          <div className="pt-4 border-t border-dashed border-gray-100 space-y-3">
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xs space-y-1 text-[11px]">
              <span className="font-bold text-slate-700 block mb-0.5">Minimum Payout Amounts</span>
              <p className="font-medium text-slate-500">
                PayPal: <strong className="text-slate-700">$100</strong> | IBAN: <strong className="text-slate-700">$100</strong> | SWIFT: <strong className="text-slate-700">$100</strong>
              </p>
            </div>

            <div className="flex justify-between items-center text-[11px] font-semibold">
              <span className="text-slate-400">Your Balance:</span>
              <span className="text-emerald-600 font-bold">${currentBalance.toFixed(2)}</span>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
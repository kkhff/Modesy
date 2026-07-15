"use client";

import React, { useState } from "react";
import { X, CreditCard, ChevronRight, Loader2, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TopUpModal({ isOpen, onClose }: TopUpModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("midtrans");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const usdAmount = Number(amount) || 0;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || usdAmount < 1) {
      toast.error("Minimum top-up fund is $1.00 USD");
      return;
    }
    setStep(2);
  };

  const handlePaySubmit = async () => {
    setLoading(true);
    const loadingToast = toast.loading("Connecting to secure payment gateway...");

    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: usdAmount }),
      });

      const data = await res.json();
      toast.dismiss(loadingToast);

      if (!data.success) throw new Error(data.error || "Failed to fetch token");

      if ((window as any).snap) {
        onClose();
        setStep(1);
        setAmount("");
        
        (window as any).snap.pay(data.token, {
          onSuccess: function () {
            toast.success("Deposit submitted successfully!");
            setTimeout(() => window.location.reload(), 1500);
          },
          onPending: function () {
            toast.success("Waiting for your payment completion.");
            setTimeout(() => window.location.reload(), 1500);
          },
          onError: function () {
            toast.error("Payment transmission rejected.");
          }
        });
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to launch payment system.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 font-sans antialiased text-xs text-slate-600 p-4">
      <div className="bg-[#f8f9fa] border border-slate-200 rounded-xs w-full max-w-[950px] shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-bold text-slate-800">Checkout - Add Funds</h3>
          <button type="button" onClick={() => { onClose(); setStep(1); }} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Konten Mengikuti Gaya Split Layout Checkout */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            /* STEP 1: INPUT NOMINAL DEPOSIT */
            <form onSubmit={handleNextStep} className="bg-white border border-slate-200 rounded-xs p-6 max-w-md mx-auto space-y-4">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Specify Funding Amount</h4>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Amount to Add (USD)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-9 pl-7 pr-3 border border-slate-200 rounded-xs focus:outline-none focus:border-[#00a896] text-slate-800 font-semibold"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 block italic">* Minimum transaction: $1.00 USD</span>
              </div>
              <button type="submit" className="w-full h-9 bg-[#00a896] hover:bg-[#009282] text-white font-bold uppercase rounded-xs flex items-center justify-center gap-1 transition-colors shadow-2xs">
                Continue to Payment Method <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: PILIH METHOD & SUMMARY (BENTUK PERSIS GAMBAR CHECKOUT LU) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* SISI KIRI: PAYMENT METHOD LIST */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xs p-5 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 mb-2">1. Payment Method</h4>
                <div className="space-y-2">
                  {/* Pilihan Gerbang Midtrans */}
                  <label className={`border rounded-xs p-3.5 flex items-center justify-between bg-white cursor-pointer transition-all ${selectedMethod === "midtrans" ? "border-[#00a896] bg-teal-50/5" : "border-slate-200"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={selectedMethod === "midtrans"} onChange={() => setSelectedMethod("midtrans")} className="accent-[#00a896]" />
                      <div>
                        <span className="font-bold text-slate-800">Midtrans Gateway</span>
                        <p className="text-slate-400 text-[10px] mt-0.5">Virtual Account, QRIS, Credit Card (IDR Auto-conversion)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-xs bg-slate-50 uppercase font-mono">
                      Visa / MasterCard / QRIS
                    </div>
                  </label>
                  
                  {/* Placeholder gerbang lain seperti di gambar asli Modesy */}
                  <div className="border border-slate-100 rounded-xs p-3.5 flex items-center justify-between bg-slate-50/50 opacity-40 select-none">
                    <div className="flex items-center gap-3">
                      <input type="radio" disabled className="accent-slate-300" />
                      <div>
                        <span className="font-bold text-slate-400">PayPal Balance</span>
                        <p className="text-slate-400 text-[10px] mt-0.5">Pay via international PayPal account balance</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button type="button" onClick={handlePaySubmit} disabled={loading} className="h-9 px-6 bg-[#00a896] hover:bg-[#009282] text-white font-bold uppercase rounded-xs flex items-center justify-center gap-1.5 shadow-md disabled:bg-slate-300">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Place Deposit"}
                  </button>
                </div>
              </div>

              {/* SISI KANAN: SUMMARY BOX */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xs p-5 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-slate-400" /> Summary
                </h4>
                <div className="space-y-3 font-medium text-slate-600">
                  <div className="flex justify-between items-start gap-2 bg-slate-50 p-2 rounded-xs border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-700 block">Add Funds</span>
                      <span className="text-[10px] text-slate-400">Deposit Amount</span>
                    </div>
                    <span className="font-bold text-slate-800">${usdAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between border-t border-slate-100 pt-3"><span className="text-slate-400">Subtotal</span><span className="font-bold text-slate-800">${usdAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-3 text-slate-900"><span>Total</span><span className="text-[#00a896] text-base font-extrabold">${usdAmount.toFixed(2)}</span></div>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
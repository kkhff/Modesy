"use client";

import React from "react";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-8 px-6 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xs flex items-center gap-1.5 text-xs transition-colors shadow-2xs cursor-pointer"
    >
      <Printer className="w-3.5 h-3.5" /> Print
    </button>
  );
}
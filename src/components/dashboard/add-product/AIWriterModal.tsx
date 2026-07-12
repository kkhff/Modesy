"use client";

import React, { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AIWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (generatedText: string) => void;
  lang: "en" | "id";
}

export default function AIWriterModal({ isOpen, onClose, onGenerate, lang }: AIWriterModalProps) {
  const [tone, setTone] = useState("casual");
  const [length, setLength] = useState("medium");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);

    try {
      // Tembak API internal Next.js yang barusan dibuat
      const response = await fetch("/api/ai-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          tone,
          length,
          lang: lang, // Atau sesuaikan secara dinamis tergantung modal pemanggil
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.text) {
        onGenerate(result.text); // Masukkan teks HTML dari Gemini ke TinyMCE
      } else {
        alert(result.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to AI server");
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white p-6 rounded-sm border border-slate-200 shadow-lg font-sans">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
          <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#00a896]" /> AI Writer
          </DialogTitle>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
          {/* Model Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Model</label>
            <select 
              value="gemini-2.5-flash" 
              disabled
              className="w-full bg-slate-50 border border-slate-200 h-9 px-2 rounded-sm focus:outline-none text-slate-500 cursor-not-allowed appearance-none"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Free)</option>
            </select>
          </div>

          {/* Tone/Style Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Tone/Style</label>
            <select 
              value={tone} 
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-white border border-slate-200 h-9 px-2 rounded-sm focus:outline-none focus:border-[#00a896]"
            >
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="funny">Funny</option>
            </select>
          </div>

          {/* Length of Text Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Length of Text</label>
            <select 
              value={length} 
              onChange={(e) => setLength(e.target.value)}
              className="w-full bg-white border border-slate-200 h-9 px-2 rounded-sm focus:outline-none focus:border-[#00a896]"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
        </div>

        {/* Topic Input Textarea */}
        <div className="mt-4 space-y-1 text-xs">
          <label className="font-bold text-slate-700">Topic</label>
          <textarea
            rows={3}
            placeholder="e.g. Red casual t-shirt made of organic cotton"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full border border-slate-200 p-2.5 rounded-sm focus:outline-none focus:border-[#00a896] text-slate-700 resize-none"
          />
        </div>

        {/* Warning Demo Banner */}
        <p className="text-center text-[11px] text-rose-500 bg-rose-50/50 py-2 px-4 rounded-sm mt-4 font-medium border border-rose-100/30">
          Warning! The API is not active in the demo. A default response about "{topic || "..."}" will be returned.
        </p>

        {/* Action Button */}
        <div className="flex justify-center mt-5">
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="bg-[#00a896] hover:bg-[#009282] disabled:opacity-50 text-white font-bold text-xs px-5 h-9 flex items-center gap-1.5 rounded-sm cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> 
            {loading ? "Generating Text..." : "Generate Text"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
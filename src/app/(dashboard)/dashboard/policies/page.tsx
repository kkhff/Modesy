"use client";

import React, { useState, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function ShopPoliciesPage() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [policyContent, setPolicyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();

  // 1. Ambil data kebijakan yang sudah tersimpan saat halaman dimuat
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from("shop_policies")
          .select("is_enabled, policy_content")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setIsEnabled(data.is_enabled);
          setPolicyContent(data.policy_content || "");
        }
      } catch (err) {
        console.error("Failed to load shop policies:", err);
        toast.error("Failed to load shop policies.");
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  // 2. Fungsi simpan data kebijakan menggunakan metode Upsert Supabase
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Session expired. Please re-login.");
        return;
      }

      const { error } = await supabase
        .from("shop_policies")
        .upsert({
          user_id: session.user.id,
          is_enabled: isEnabled,
          policy_content: policyContent,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Shop policies updated successfully!");
    } catch (err) {
      console.error("Failed to save policies:", err);
      toast.error("Failed to save policies. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full text-center py-12 text-xs font-medium text-slate-400">
        Loading shop policies editor...
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-3xs font-sans text-xs text-slate-600 max-w-[1000px] mx-auto">
      
      {/* Title Header */}
      <h1 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
        Shop Policies
      </h1>

      <form onSubmit={handleSavePolicies} className="space-y-6">
        
        {/* Kontrol Status Pilihan: Enable / Disable */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-3">Status</label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="radio"
                name="policyStatus"
                checked={isEnabled === true}
                onChange={() => setIsEnabled(true)}
                className="w-4 h-4 accent-[#00a896]"
              />
              <span>Enable</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="radio"
                name="policyStatus"
                checked={isEnabled === false}
                onChange={() => setIsEnabled(false)}
                className="w-4 h-4 accent-[#00a896]"
              />
              <span>Disable</span>
            </label>
          </div>
        </div>

        {/* Input Text Editor TinyMCE */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Content</label>
          <div className="border border-slate-200 rounded-sm overflow-hidden bg-white">
            <Editor
              tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"
              init={{
                height: 380,
                menubar: "file insert format table",
                plugins: "lists link image charmap preview anchor code table wordcount",
                toolbar: "fullscreen code preview | undo redo | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | numlist bullist | forecolor backcolor | image link",
                content_style: "body { font-family:Inter,sans-serif; font-size:12px; color:#334155 }",
                branding: false,
                promotion: false,
                setup: (editor: any) => {
                  editor.on('init', () => {
                    const notifications = document.querySelectorAll('.tox-notification');
                    notifications.forEach(n => (n as HTMLElement).style.display = 'none');
                  });
                }
              }}
              value={policyContent}
              onEditorChange={(content) => setPolicyContent(content)}
            />
          </div>
        </div>

        {/* Aksi Tombol Submit Simpan Perubahan */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#00a896] hover:bg-[#009282] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold px-5 h-9 rounded-sm cursor-pointer transition-colors shadow-2xs"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </form>

    </div>
  );
}
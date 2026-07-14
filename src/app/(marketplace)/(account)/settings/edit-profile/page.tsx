"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Loader2, User } from "lucide-react";
import toast from "react-hot-toast";
import { updateProfileRoute } from "./action";
import { resizeAndConvertToWebp } from "@/lib/utils/image";

export default function EditProfilePage() {
  const supabase = createClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [formData, setFormData] = useState({
    avatarUrl: "",
    coverUrl: "",
    email: "",
    slug: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    taxRegistration: "",
    coverImageType: "full_width",
    emailOnMessage: true,
    showEmail: false,
    showPhone: false,
    showLocation: true,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            avatarUrl: data.avatar_url || "",
            coverUrl: data.cover_url || "",
            email: data.email || "",
            slug: data.slug || "",
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            phoneNumber: data.phone_number || "",
            taxRegistration: data.tax_registration_number || "",
            coverImageType: data.cover_image_type || "full_width",
            emailOnMessage: data.email_on_message ?? true,
            showEmail: data.show_email ?? false,
            showPhone: data.show_phone ?? false,
            showLocation: data.show_location ?? true,
          });
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Gagal memuat profil");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // UPLOAD & COMPRESS AVATAR
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const toastId = toast.loading("Memproses & mengompresi avatar...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("User tidak terautentikasi");

      const webpBlob = await resizeAndConvertToWebp(file, 300, 300, 0.85);
      const fileName = `${session.user.id}-${Math.random()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, webpBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, avatarUrl: publicUrl }));
      toast.success("Avatar berhasil terpasang di form!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal mengunggah avatar", { id: toastId });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // UPLOAD & COMPRESS COVER BANNER
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const toastId = toast.loading("Memproses & mengompresi banner...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("User tidak terautentikasi");

      const webpBlob = await resizeAndConvertToWebp(file, 1200, 400, 0.85);
      const fileName = `${session.user.id}-${Math.random()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(fileName, webpBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("covers")
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, coverUrl: publicUrl }));
      toast.success("Banner berhasil terpasang di form!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal mengunggah banner", { id: toastId });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Langsung passing objek formData terbaru ke server action
    const result = await updateProfileRoute(formData);
    setSaving(false);

    if (result.success) {
      toast.success("Profil berhasil diperbarui!");
    } else {
      toast.error(result.error || "Gagal memperbarui profil");
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#00a896] animate-spin mb-2" />
        <p className="text-sm text-gray-500">Memuat formulir profil...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-sm p-6 sm:p-8 shadow-sm font-sans mb-12">
      
      {/* INPUT FILE TERSEMBUNYI */}
      <input type="file" ref={avatarInputRef} onChange={handleAvatarFileChange} accept="image/*" className="hidden" />
      <input type="file" ref={coverInputRef} onChange={handleCoverFileChange} accept="image/*" className="hidden" />

      {/* AREA BANNER & AVATAR EDIT */}
      <div 
        className="w-full relative bg-gray-100 border border-gray-200 rounded-sm h-[180px] mb-16 group bg-cover bg-center transition-all"
        style={{ backgroundImage: formData.coverUrl ? `url(${formData.coverUrl})` : "none" }}
      >
        <button 
          type="button" 
          disabled={uploadingCover}
          onClick={() => coverInputRef.current?.click()}
          className="absolute top-4 right-4 w-8 h-8 bg-[#00a896] hover:bg-[#009282] text-white rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer z-10 disabled:opacity-50"
        >
          {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </button>

        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 sm:left-12 sm:translate-x-0 w-28 h-28 bg-white border-2 border-white rounded-full shadow-md overflow-hidden relative group/avatar">
          {formData.avatarUrl ? (
            <img src={formData.avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400">
              <User className="w-12 h-12" />
            </div>
          )}
          <button 
            type="button"
            disabled={uploadingAvatar}
            onClick={() => avatarInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer text-[10px] disabled:opacity-50"
          >
            {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 mb-0.5" />}
          </button>
        </div>
      </div>
      
      <p className="text-xs text-gray-400 mb-6 italic">
        *Click on the save changes button after selecting your image
      </p>

      {/* FORM PENGATURAN DATA TEXT */}
      <form onSubmit={handleSaveProfile} className="space-y-5">
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 block">
            Email Address <span className="text-green-600 font-normal text-[11px]">(Confirmed)</span>
          </label>
          <Input type="email" value={formData.email} disabled className="h-10 bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed select-none rounded-sm" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 block">Slug</label>
          <Input type="text" name="slug" value={formData.slug} onChange={handleInputChange} className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 block">First Name</label>
            <Input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 block">Last Name</label>
            <Input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 block">Phone Number</label>
          <Input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} placeholder="Phone Number" className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 block">Tax Registration Number</label>
          <Input type="text" name="taxRegistration" value={formData.taxRegistration} onChange={handleInputChange} placeholder="Tax Registration Number" className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm" />
        </div>

        {/* COVER IMAGE TYPE */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-semibold text-gray-600 block">Cover Image Type</label>
          <div className="flex items-center gap-8 text-xs text-gray-500">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" name="coverImageType" value="full_width" checked={formData.coverImageType === "full_width"} onChange={(e) => setFormData((prev) => ({ ...prev, coverImageType: e.target.value }))} className="w-4 h-4 accent-[#00a896] border-gray-300 cursor-pointer" />
              <span>Full Width</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" name="coverImageType" value="boxed" checked={formData.coverImageType === "boxed"} onChange={(e) => setFormData((prev) => ({ ...prev, coverImageType: e.target.value }))} className="w-4 h-4 accent-[#00a896] border-gray-300 cursor-pointer" />
              <span>Boxed</span>
            </label>
          </div>
        </div>

        {/* CHECKBOX SETTINGS ACCENT TOSKA */}
        <div className="space-y-3.5 pt-3 border-t border-gray-100 flex flex-col">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="emailOnMessage" className="border border-gray-300 w-4 h-4 rounded-xs transition-colors accent-[#00a896] cursor-pointer" checked={formData.emailOnMessage} onChange={(e) => setFormData((prev) => ({ ...prev, emailOnMessage: e.target.checked }))} />
            <label htmlFor="emailOnMessage" className="text-xs text-gray-500 cursor-pointer select-none">Send me an email when someone send me a message</label>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="showEmail" className="border border-gray-300 w-4 h-4 rounded-xs transition-colors accent-[#00a896] cursor-pointer" checked={formData.showEmail} onChange={(e) => setFormData((prev) => ({ ...prev, showEmail: e.target.checked }))} />
            <label htmlFor="showEmail" className="text-xs text-gray-500 cursor-pointer select-none">Show my email address</label>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="showPhone" className="border border-gray-300 w-4 h-4 rounded-xs transition-colors accent-[#00a896] cursor-pointer" checked={formData.showPhone} onChange={(e) => setFormData((prev) => ({ ...prev, showPhone: e.target.checked }))} />
            <label htmlFor="showPhone" className="text-xs text-gray-500 cursor-pointer select-none">Show my phone number</label>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="showLocation" className="border border-gray-300 w-4 h-4 rounded-xs transition-colors accent-[#00a896] cursor-pointer" checked={formData.showLocation} onChange={(e) => setFormData((prev) => ({ ...prev, showLocation: e.target.checked }))} />
            <label htmlFor="showLocation" className="text-xs text-gray-500 cursor-pointer select-none">Show my location</label>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={saving} className="h-10 bg-[#00a896] hover:bg-[#009282] text-white text-xs font-semibold px-6 rounded-sm transition-colors cursor-pointer shadow-xs">
            {saving ? "Saving changes..." : "Save Changes"}
          </Button>
        </div>

      </form>
    </div>
  );
}
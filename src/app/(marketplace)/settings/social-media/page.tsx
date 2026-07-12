"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { updateSocialMediaRoute } from "./action";

export default function SocialMediaSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State yang memetakan kolom di database
  const [socialForm, setSocialForm] = useState({
    facebook_url: "",
    twitter_url: "",
    instagram_url: "",
    tiktok_url: "",
    whatsapp_url: "",
    youtube_url: "",
    discord_url: "",
    telegram_url: "",
    pinterest_url: "",
    linkedin_url: "",
    twitch_url: "",
    vk_url: "",
    personal_website_url: "",
  });

  useEffect(() => {
    const fetchSocialMedia = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from("user_social_medias")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle(); // Menggunakan maybeSingle agar tidak melempar error jika data kosong

        if (error) throw error;

        if (data) {
          setSocialForm({
            facebook_url: data.facebook_url || "",
            twitter_url: data.twitter_url || "",
            instagram_url: data.instagram_url || "",
            tiktok_url: data.tiktok_url || "",
            whatsapp_url: data.whatsapp_url || "",
            youtube_url: data.youtube_url || "",
            discord_url: data.discord_url || "",
            telegram_url: data.telegram_url || "",
            pinterest_url: data.pinterest_url || "",
            linkedin_url: data.linkedin_url || "",
            twitch_url: data.twitch_url || "",
            vk_url: data.vk_url || "",
            personal_website_url: data.personal_website_url || "",
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load social media links");
      } finally {
        setLoading(false);
      }
    };

    fetchSocialMedia();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSocialForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const result = await updateSocialMediaRoute(socialForm);
    setSaving(false);

    if (result.success) {
      toast.success("Social media links updated successfully!");
    } else {
      toast.error(result.error || "Failed to save changes");
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center min-h-[350px]">
        <Loader2 className="w-8 h-8 text-[#00a896] animate-spin mb-2" />
        <p className="text-sm text-gray-500">Loading social media configurations...</p>
      </div>
    );
  }

  // Array konfigurasi untuk merender semua field secara dinamis & rapi
  const socialFields = [
    { name: "facebook_url", label: "Facebook URL", placeholder: "Facebook URL" },
    { name: "twitter_url", label: "Twitter URL", placeholder: "Twitter URL" },
    { name: "instagram_url", label: "Instagram URL", placeholder: "Instagram URL" },
    { name: "tiktok_url", label: "Tiktok URL", placeholder: "Tiktok URL" },
    { name: "whatsapp_url", label: "WhatsApp URL", placeholder: "WhatsApp URL" },
    { name: "youtube_url", label: "Youtube URL", placeholder: "Youtube URL" },
    { name: "discord_url", label: "Discord Url", placeholder: "Discord Url" },
    { name: "telegram_url", label: "Telegram URL", placeholder: "Telegram URL" },
    { name: "pinterest_url", label: "Pinterest URL", placeholder: "Pinterest URL" },
    { name: "linkedin_url", label: "Linkedin URL", placeholder: "Linkedin URL" },
    { name: "twitch_url", label: "Twitch Url", placeholder: "Twitch Url" },
    { name: "vk_url", label: "VK URL", placeholder: "VK URL" },
    { name: "personal_website_url", label: "Personal Website URL", placeholder: "Personal Website URL" },
  ];

  return (
    <div className="w-full bg-white border border-gray-200 rounded-sm p-6 sm:p-8 shadow-sm font-sans mb-12">
      <form onSubmit={handleSaveSocial} className="space-y-4">
        
        {socialFields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 block">
              {field.label}
            </label>
            <Input
              type="text"
              name={field.name}
              placeholder={field.placeholder}
              value={socialForm[field.name as keyof typeof socialForm]}
              onChange={handleInputChange}
              className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm placeholder:text-gray-300 text-sm"
            />
          </div>
        ))}

        {/* Tombol Simpan */}
        <div className="pt-3">
          <Button
            type="submit"
            disabled={saving}
            className="h-10 bg-[#00a896] hover:bg-[#009282] text-white text-xs font-semibold px-6 rounded-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saving ? "Saving changes..." : "Save Changes"}
          </Button>
        </div>

      </form>
    </div>
  );
}
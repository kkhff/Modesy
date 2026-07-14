import React from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getShopPoliciesContent(slug: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 1. Cari profile ID berdasarkan slug vendor di URL
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile) return null;

  // 2. Ambil data kebijakan dari tabel shop_policies
  const { data: policy } = await supabase
    .from("shop_policies")
    .select("is_enabled, policy_content")
    .eq("user_id", profile.id)
    .maybeSingle();

  return policy;
}

export default async function ShopPoliciesProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = await getShopPoliciesContent(slug);

  // Jika data tidak ditemukan atau status kebijakan di-disable oleh vendor
  if (!policy || !policy.is_enabled || !policy.policy_content) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-xs p-8 text-center shadow-3xs font-sans text-xs text-slate-400 italic">
        This store hasn't added any shop policies yet.
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xs p-6 shadow-3xs font-sans text-xs text-slate-700">
      
      {/* RENDER HTML CONTENT DARI TINYMCE SECARA AMAN */}
      <div 
        className="prose max-w-none text-slate-600 leading-relaxed font-medium space-y-4 
          prose-h1:text-sm prose-h1:font-bold prose-h1:text-slate-800 prose-h1:mt-6 prose-h1:mb-2
          prose-h2:text-xs prose-h2:font-bold prose-h2:text-slate-800 prose-h2:mt-4 prose-h2:mb-1
          prose-p:mb-3 prose-strong:text-slate-800 prose-ul:list-disc prose-ul:pl-4"
        dangerouslySetInnerHTML={{ __html: policy.policy_content }}
      />

    </div>
  );
}
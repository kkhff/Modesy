"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function submitVendorRequestAction() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Session expired." };

    // Cek profil user saat ini
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return { success: false, error: "Profile not found." };
    if (profile.role !== "member") return { success: false, error: "Only members can request to sell." };

    // Masukkan data pengajuan secara aman dengan upsert (jika sudah ada data pending, tidak akan double)
    const { error } = await supabase
      .from("vendor_requests")
      .upsert(
        { user_id: user.id, status: "pending", updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("🔴 Vendor Request Error:", err.message);
    return { success: false, error: err.message };
  }
}
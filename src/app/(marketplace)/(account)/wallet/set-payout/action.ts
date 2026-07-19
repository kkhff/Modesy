"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function upsertPayoutAccountAction(payload: any) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    // 1. Validasi user real-time auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Session expired. Please re-login." };

    // 2. Lakukan Upsert (Insert jika baru, Update jika sudah ada berdasarkan user_id)
    const { error: upsertError } = await supabase
      .from("user_payout_accounts")
      .upsert({
        user_id: user.id,
        ...payload,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    if (upsertError) throw upsertError;

    return { success: true };
  } catch (err: any) {
    console.error("Upsert Payout Account Error:", err.message);
    return { success: false, error: err.message || "Failed to save layout settings." };
  }
}
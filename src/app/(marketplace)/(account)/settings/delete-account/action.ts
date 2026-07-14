"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function deleteAccountRoute(password: string) {
  const cookieStore = await cookies();

  // 1. Buat client standar buat memverifikasi password user saat ini
  const supabaseStandard = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );

  const { data: { session } } = await supabaseStandard.auth.getSession();
  if (!session?.user || !session.user.email) {
    return { success: false, error: "Unauthorized access" };
  }

  // Cek jika user murni OAuth Google (belum pernah bikin password lokal seperti step sebelumnya)
  const identities = session.user.identities || [];
  const hasPassword = identities.some((identity) => identity.provider === "email");

  // Jika akunnya pakai password, wajib validasi dulu sandinya cocok atau tidak
  if (hasPassword) {
    const { error: verifyError } = await supabaseStandard.auth.signInWithPassword({
      email: session.user.email,
      password: password,
    });

    if (verifyError) {
      return { success: false, error: "Password yang Anda masukkan salah." };
    }
  }

  // 2. Jika password valid, panggil Admin API via Service Role untuk menghapus user secara permanen
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Pastikan taruh service role key di env ya!
  );

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
    session.user.id
  );

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // 3. Hapus session cookies di browser klien agar otomatis log out murni
  const { error: signOutError } = await supabaseStandard.auth.signOut();

  return { success: true };
}
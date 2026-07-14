"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function changePasswordRoute(passwordData: any) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user || !session.user.email) {
    return { success: false, error: "Unauthorized access" };
  }

  // Cek apakah user memiliki metode password di akunnya
  const identities = session.user.identities || [];
  const hasPasswordMethod = identities.some((identity) => identity.provider === "email");

  // JIKA SUDAH PUNYA PASSWORD (baik user email biasa ATAU user Google yang sudah pernah bikin password)
  if (hasPasswordMethod) {
    if (!passwordData.oldPassword) {
      return { success: false, error: "Password lama wajib diisi." };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: passwordData.oldPassword,
    });

    if (verifyError) {
      return { success: false, error: "Password lama yang Anda masukkan salah." };
    }
  }

  // Eksekusi update ke password baru
  const { error: updateError } = await supabase.auth.updateUser({
    password: passwordData.newPassword,
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}   
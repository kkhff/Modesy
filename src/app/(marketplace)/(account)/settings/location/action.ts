"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function updateLocationRoute(locationData: any) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Cek otentikasi user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Unauthorized access" };
  }

  // Update data lokasi ke kolom tabel profiles publik kamu
  const { error } = await supabase
    .from("profiles")
    .update({
      country: locationData.country,
      state_or_province: locationData.state,
      city: locationData.city,
      address: locationData.address,
      zip_code: locationData.zipCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function updateProfileRoute(formData: any) {
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

  // Ambil user id aktif dari session server
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Unauthorized access" };
  }

  // Eksekusi update langsung ke PostgreSQL
  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: formData.avatarUrl,          
      cover_url: formData.coverUrl,            
      slug: formData.slug,
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone_number: formData.phoneNumber,
      tax_registration_number: formData.taxRegistration,
      cover_image_type: formData.coverImageType,
      email_on_message: formData.emailOnMessage,
      show_email: formData.showEmail,
      show_phone: formData.showPhone,
      show_location: formData.showLocation,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
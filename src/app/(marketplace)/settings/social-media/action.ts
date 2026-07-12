"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateSocialMediaRoute(socialData: any) {
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Unauthorized access" };
  }

  // Gunakan upsert agar otomatis membuat baris baru jika user pertama kali mengisi sosmed
  const { error } = await supabase
    .from("user_social_medias")
    .upsert({
      user_id: session.user.id,
      facebook_url: socialData.facebook_url || null,
      twitter_url: socialData.twitter_url || null,
      instagram_url: socialData.instagram_url || null,
      tiktok_url: socialData.tiktok_url || null,
      whatsapp_url: socialData.whatsapp_url || null,
      youtube_url: socialData.youtube_url || null,
      discord_url: socialData.discord_url || null,
      telegram_url: socialData.telegram_url || null,
      pinterest_url: socialData.pinterest_url || null,
      linkedin_url: socialData.linkedin_url || null,
      twitch_url: socialData.twitch_url || null,
      vk_url: socialData.vk_url || null,
      personal_website_url: socialData.personal_website_url || null,
    }, { onConflict: "user_id" });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/social-media");
  return { success: true };
}
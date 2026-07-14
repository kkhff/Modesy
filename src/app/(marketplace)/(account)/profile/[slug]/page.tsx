import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function ProfileRootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile) {
    redirect("/");
  }

  // 🌟 LOGIKA AUTO-REDIRECT UTAMA SESUAI STRATEGI ROLE USER
  if (profile.role === "admin" || profile.role === "vendor") {
    redirect(`/profile/${slug}/products`);
  } else {
    redirect(`/profile/${slug}/followers`);
  }
}
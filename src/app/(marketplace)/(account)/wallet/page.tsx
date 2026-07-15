import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function WalletRootPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();

  // 🌟 JIKA PENJUAL: Lempar ke halaman Pendapatan Toko utama
  if (profile?.role === "admin" || profile?.role === "vendor") {
    redirect("/wallet/earnings");
  } else {
    // 🌟 JIKA PEMBELI BIASA: Lempar ke riwayat Deposit/Top-Up uang mereka
    redirect("/wallet/deposits");
  }
}
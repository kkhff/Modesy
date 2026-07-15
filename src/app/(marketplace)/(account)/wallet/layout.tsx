import React from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import WalletMenuTabs from "./WalletMenuTabs";
import WalletHeaderWrapper from "./WalletHeaderWrapper"; 

async function getWalletData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
  const { data: wallet } = await supabase.from("user_wallets").select("balance").eq("user_id", session.user.id).maybeSingle();

  return {
    balance: Number(wallet?.balance || 0.00),
    isSeller: profile?.role === "admin" || profile?.role === "vendor",
  };
}

export default async function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { balance, isSeller } = await getWalletData();

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen font-sans pb-16 antialiased text-xs text-slate-600">
      <div className="max-w-[1200px] mx-auto px-4 pt-8">
        <h1 className="text-xl font-bold text-gray-800 mb-6 tracking-tight">Wallet</h1>

        {/* CARD SALDO UTAMA INTEGRASI DI SINI */}
        <WalletHeaderWrapper balance={balance} />

        {/* TABS MENU KONTEN */}
        <WalletMenuTabs isSeller={isSeller} />

        <div className="w-full bg-white border border-t-0 border-gray-200 rounded-b-sm p-6 shadow-3xs">
          {children}
        </div>
      </div>
    </div>
  );
}
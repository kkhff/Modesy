import React from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Wallet, Plus } from "lucide-react";
import Link from "next/link";
import WalletMenuTabs from "./WalletMenuTabs"; // Client component untuk handling active tab styling

async function getWalletData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");

  // Ambil role user
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
  
  // Ambil saldo dompet
  const { data: wallet } = await supabase.from("user_wallets").select("balance").eq("user_id", session.user.id).maybeSingle();

  return {
    balance: wallet?.balance || 0.00,
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
    <div className="w-full bg-[#f8f9fa] min-h-screen font-sans pb-16">
      <div className="max-w-[1200px] mx-auto px-4 pt-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Wallet</h1>

        {/* CARD SALDO UTAMA */}
        <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-sm p-6 text-center relative shadow-2xs mb-8">
          <div className="absolute top-4 right-4">
            <button className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-sm px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add Funds
            </button>
          </div>
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-teal-50 rounded-full text-[#00a896]">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Wallet Balance</p>
          <h2 className="text-3xl font-black text-gray-800 mt-1">
            Rp {Number(balance).toLocaleString("id-ID")}
          </h2>
        </div>

        {/* CLIENT TAB NAVIGATION BAR */}
        <WalletMenuTabs isSeller={isSeller} />

        {/* CONTAINER DINAMIS SUB-PAGE KONTEN TAB */}
        <div className="w-full bg-white border border-t-0 border-gray-200 rounded-b-sm p-6 shadow-3xs">
          {children}
        </div>
      </div>
    </div>
  );
}
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createPayoutRequestAction(formData: { amount: number; method: string }) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    // 1. Validasi user secara aman lewat server auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Session expired. Please re-login." };

    const withdrawalAmount = Number(formData.amount);

    // 2. Validasi Batas Minimum Mutlak ($100)
    if (withdrawalAmount < 100) {
      return { success: false, error: "Minimum payout request amount is $100.00 USD." };
    }

    // 3. Cek Saldo Terkini di database
    const { data: wallet, error: walletError } = await supabase
      .from("user_wallets")
      .select("id, balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError || !wallet) return { success: false, error: "Wallet not found." };

    const currentBalance = Number(wallet.balance || 0);
    if (currentBalance < withdrawalAmount) {
      return { success: false, error: "Your wallet balance is insufficient." };
    }

    // 4. POTONG SALDO DOMPET USER SEKARANG JUGA (WALUPUN STATUS MASIH PENDING)
    const newBalance = currentBalance - withdrawalAmount;
    const { error: walletUpdateError } = await supabase
      .from("user_wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", wallet.id);

    if (walletUpdateError) throw new Error(`Failed to deduct wallet balance: ${walletUpdateError.message}`);

    // 5. Masukkan ke tabel penarikan dana (wallet_payouts) dengan status 'pending'
    const { error: insertError } = await supabase
      .from("wallet_payouts")
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        payout_method: formData.method,
        amount: withdrawalAmount,
        status: "pending",
        created_at: new Date().toISOString()
      });

    if (insertError) {
      // Rollback saldo jika entri ke wallet_payouts gagal agar uang tidak hilang misterius
      await supabase
        .from("user_wallets")
        .update({ balance: currentBalance })
        .eq("id", wallet.id);
        
      throw insertError;
    }

    // 6. CATAT KE BUKU BESAR (wallet_transactions) SEBAGAI EXPENSES / PAYOUT LOG
    // Opsional: Gunakan tipe 'payouts' jika ada, atau 'expenses' agar saldo di riwayat singkron berkurang
    const { error: txInsertError } = await supabase
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        type: "expenses", 
        amount: withdrawalAmount,
        description: `Withdrawn funds request via ${formData.method} (Pending Review)`,
        status: "completed" // Log mutasi saldonya diset completed karena angka saldo riilnya sudah berkurang
      });

    if (txInsertError) console.error("[Warning - Payout Tx Log Failed]:", txInsertError.message);

    return { success: true };
  } catch (err: any) {
    console.error("Payout Action Crash:", err.message);
    return { success: false, error: err.message || "Failed to submit request." };
  }
}
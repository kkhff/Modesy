"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function saveCouponAction(payload: any, couponId?: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    // 1. Validasi user secara aman
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Session expired. Please re-login." };

    const couponData = {
      vendor_id: user.id,
      coupon_code: payload.coupon_code.toUpperCase().trim(),
      discount_rate: Number(payload.discount_rate),
      number_of_coupons: Number(payload.number_of_coupons),
      minimum_order_amount: Number(payload.minimum_order_amount || 0),
      usage_type: payload.usage_type, // 'single' atau 'multiple'
      is_public: payload.is_public, // boolean
      expiry_date: new Date(payload.expiry_date).toISOString()
    };

    if (couponId) {
      // 🌟 EDIT MODE: Update kupon yang sudah ada
      const { error: updateError } = await supabase
        .from("coupons")
        .update(couponData)
        .eq("id", couponId)
        .eq("vendor_id", user.id); // Pastikan vendor yang mengedit adalah pemilik kuponnya

      if (updateError) {
        if (updateError.code === "23505") return { success: false, error: "Coupon code already exists!" };
        throw updateError;
      }
    } else {
      // 🌟 ADD MODE: Insert kupon baru
      const { error: insertError } = await supabase
        .from("coupons")
        .insert(couponData);

      if (insertError) {
        if (insertError.code === "23505") return { success: false, error: "Coupon code already exists!" };
        throw insertError;
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Save Coupon Crash:", err.message);
    return { success: false, error: err.message || "Failed to save coupon." };
  }
}

export async function deleteCouponAction(couponId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    // Validasi sesi user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Session expired." };

    // Eksekusi hapus kupon berdasarkan ID dan pastikan milik vendor yang request
    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", couponId)
      .eq("vendor_id", user.id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error("Delete Coupon Error:", err.message);
    return { success: false, error: err.message || "Failed to delete coupon." };
  }
}
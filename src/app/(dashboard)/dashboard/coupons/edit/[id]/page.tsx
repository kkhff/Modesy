import React from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { Ticket } from "lucide-react";
import CouponForm from "@/components/dashboard/CouponForm";

async function getCouponDetail(id: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ambil data kupon yang ID dan pemiliknya adalah user yang sedang login
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", id)
    .eq("vendor_id", user.id)
    .maybeSingle();

  if (!coupon) redirect("/dashboard/coupons");

  return coupon;
}

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const couponData = await getCouponDetail(resolvedParams.id);

  return (
    <div className="w-full bg-[#f7f8f9] min-h-screen font-sans antialiased text-xs text-slate-600 p-6 space-y-4">
      
      {/* HEADER NAVIGASI */}
      <div className="bg-white border border-gray-200/80 rounded-sm p-4 flex justify-between items-center shadow-3xs">
        <h1 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-[#00a896]" /> Edit Coupon
        </h1>
        <Link
          href="/dashboard/coupons"
          className="h-9 px-4 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1.5 transition-colors text-xs"
        >
          Coupons
        </Link>
      </div>

      {/* RENDER FORM DENGAN INJECT DATA INITIAL */}
      <CouponForm initialData={couponData} couponId={resolvedParams.id} />
    </div>
  );
}
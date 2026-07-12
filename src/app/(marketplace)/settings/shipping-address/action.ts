"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );
}

// 1. Ambil Semua Alamat User
export async function getAddressesRoute() {
  const supabase = await getSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// 2. Tambah Alamat Baru atau Edit Alamat Eksis (Upsert)
export async function saveAddressRoute(addressData: any) {
  const supabase = await getSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const payload = {
    user_id: session.user.id,
    address_type: addressData.addressType,
    address_title: addressData.addressTitle,
    first_name: addressData.firstName,
    last_name: addressData.lastName,
    email: addressData.email,
    phone_number: addressData.phoneNumber,
    country: addressData.country,
    state: addressData.state,
    city: addressData.city,
    zip_code: addressData.zipCode,
    address: addressData.address,
  };

  let query;
  if (addressData.id) {
    // Mode Update / Edit
    query = supabase.from("user_addresses").update(payload).eq("id", addressData.id);
  } else {
    // Mode Insert Baru
    query = supabase.from("user_addresses").insert([payload]);
  }

  const { error } = await query;
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/shipping-address");
  return { success: true };
}

// 3. Hapus Alamat
export async function deleteAddressRoute(id: string) {
  const supabase = await getSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("user_addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/shipping-address");
  return { success: true };
}
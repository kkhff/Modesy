// app/dashboard/products/actions.ts
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// 🌟 FUNGSI PEMBANTU SLUGIFY OTOMATIS
function generateSlug(title: string): string {
  const cleanTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Hapus semua karakter aneh kecuali huruf, angka, spasi, dan strip
    .replace(/[\s_-]+/g, "-") // Ubah spasi atau strip ganda menjadi satu strip
    .replace(/^-+|-+$/g, ""); // Hapus strip di awal atau akhir kalimat

  // Tambahkan 4 digit acak di belakang biar URL selalu unik meskipun judul produknya sama
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); 
  
  return `${cleanTitle}-${randomSuffix}`;
}

export async function duplicateProductAction(productId: number) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );

  try {
    // 1. Ambil data produk lama
    const { data: product, error: pError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (pError || !product) return { success: false, error: "Produk asli tidak ditemukan" };

    // 2. Siapkan data produk baru (Hilangkan ID, reset views, promo, dan SLUG)
    const { 
      id, 
      created_at, 
      updated_at, 
      page_views, 
      is_promoted, 
      promote_start_date, 
      promote_end_date, 
      slug, // 🌟 BUANG SLUG LAMA BIAR TIDAK DUPLIKAT
      ...clonedData 
    } = product;
    
    // 3. Setel ulang value untuk properti produk hasil duplikat
    const newTitle = `${clonedData.title} (Copy)`;
    clonedData.title = newTitle;
    clonedData.slug = generateSlug(newTitle); // 🌟 GENERATE SLUG BARU YANG UNIK BERDASARKAN JUDUL BARU
    clonedData.sku = clonedData.sku ? `${clonedData.sku}-COPY` : null;
    clonedData.page_views = 0; 
    clonedData.is_promoted = false; // Pastikan status iklan mati pas di-copy

    // 4. Insert produk kloningan ke database
    const { data: newProduct, error: insertError } = await supabase
      .from("products")
      .insert([clonedData])
      .select()
      .single();

    if (insertError || !newProduct) return { success: false, error: `Gagal kloning produk: ${insertError?.message}` };

    // 5. Ambil variasi dari produk lama (jika ada)
    const { data: variations, error: vError } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", productId);

    // 6. Jika ada variasi, kloning dan hubungkan ke ID produk baru
    if (variations && variations.length > 0) {
      const clonedVariations = variations.map((v) => {
        const { id: varId, created_at: vCreated, ...varData } = v;
        return {
          ...varData,
          product_id: newProduct.id, // Pasangkan ke ID produk yang baru jadi
        };
      });

      const { error: bulkVarError } = await supabase
        .from("product_variations")
        .insert(clonedVariations);

      if (bulkVarError) {
        return { success: true, warning: "Produk berhasil dikloning, tetapi gagal menduplikasi variannya." };
      }
    }

    revalidatePath("/dashboard/products");
    return { success: true, message: "Produk berhasil diduplikasi!" };

  } catch (err: any) {
    return { success: false, error: err.message || "Internal server error." };
  }
}

export async function deleteProductAction(productId: number) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(name: string) { return cookieStore.get(name)?.value; } },
    }
  );

  try {
    // Sesuai constraint ON DELETE CASCADE (atau hapus manual dulu variannya)
    await supabase.from("product_variations").delete().eq("product_id", productId);
    
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/products");
    return { success: true, message: "Product successfully deleted!" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
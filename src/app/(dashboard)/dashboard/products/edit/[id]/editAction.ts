"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateProductAction(formData: FormData) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Unauthorized. Silakan login kembali." };
  }

  try {
    const productId = Number(formData.get("id"));
    const productType = formData.get("productType") as string;
    const listingType = formData.get("listingType") as string;
    const categoryId = formData.get("category") ? Number(formData.get("category")) : null;
    const brandId = formData.get("brand") ? Number(formData.get("brand")) : null;
    const externalLink = formData.get("externalLink") as string || null;
    const demoUrl = formData.get("demoUrl") as string || null;

    const titleEn = formData.get("titleEn") as string;
    const titleId = formData.get("titleId") as string || null;
    const descEn = formData.get("descEn") as string || null;
    const descId = formData.get("descId") as string || null;
    const sku = formData.get("sku") as string || null;

    const price = formData.get("price") ? Number(formData.get("price")) : 0;
    const discountRate = formData.get("discountRate") ? Number(formData.get("discountRate")) : 0;
    // 🌟 1. TANGKAP NILAI NOMINAL HARGA DISKON DI SINI DENGAN BENAR
    const discountedPrice = formData.get("discountedPrice") ? Number(formData.get("discountedPrice")) : null;
    const vatRate = formData.get("vatRate") ? Number(formData.get("vatRate")) : 0;
    const stock = formData.get("stock") ? Number(formData.get("stock")) : 1;

    // Data Logistik & Pengiriman
    const weight = formData.get("weight") ? Number(formData.get("weight")) : 0;
    const length = formData.get("length") ? Number(formData.get("length")) : 0;
    const width = formData.get("width") ? Number(formData.get("width")) : 0;
    const height = formData.get("height") ? Number(formData.get("height")) : 0;
    const deliveryTime = formData.get("deliveryTime") as string || null;

    // Parse data gambar & variasi kiriman frontend
    const existingImagesJson = formData.get("existingImages") as string;
    const existingImages: string[] = existingImagesJson ? JSON.parse(existingImagesJson) : [];

    const variationsJson = formData.get("variations") as string;
    const variations = variationsJson ? JSON.parse(variationsJson) : [];

    // --- 1. PROSES IMAGE UPLOAD (.WEBP) ---
    const newImageFiles = formData.getAll("images") as File[];
    const newImageUrls: string[] = [];

    for (const file of newImageFiles) {
      if (file.size === 0) continue;
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file);
      if (uploadError) return { success: false, error: `Gagal upload gambar baru: ${uploadError.message}` };

      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) newImageUrls.push(publicUrlData.publicUrl);
    }

    const finalImageUrls = [...existingImages, ...newImageUrls];

    // --- 2. UPDATE DATA PARENT (PRODUCTS TABLE) ---
    const { error: updateError } = await supabase
      .from("products")
      .update({
        product_type: productType,
        listing_type: listingType,
        category_id: categoryId,
        brand_id: brandId,
        external_link: externalLink,
        demo_url: demoUrl,
        title: titleEn,
        title_lang2: titleId,
        description: descEn,
        description_lang2: descId,
        sku: sku,
        price: price,
        discount_rate: discountRate,
        // 🌟 2. MASUKKAN VARIABEL DENGAN BENAR (TYPO SUDAH DIBERSIHKAN)
        discounted_price: discountedPrice, 
        vat_rate: vatRate,
        stock: stock,
        weight: weight,
        length: length,
        width: width,
        height: height,
        delivery_time: deliveryTime,
        image_urls: finalImageUrls,
        
        // SINKRONKAN TANGKAPAN DENGAN KEY YANG DI-APPEND FRONTEND
        country: formData.get("country") as string || null,
        state: formData.get("state") as string || null,
        city: formData.get("cityId") as string || null,
        address: formData.get("address") as string || null,
        zip_code: formData.get("zipCode") as string || null,
        
        variation_options: formData.get("variationOptions") ? JSON.parse(formData.get("variationOptions") as string) : [],
        updated_at: new Date().toISOString()
      })
      .eq("id", productId)
      .eq("user_id", session.user.id);

    if (updateError) return { success: false, error: `Gagal memperbarui database produk: ${updateError.message}` };

    // =========================================================================
    // --- 3. FIX TOTAL: SKEMA BONGKAR & PASANG MASSAL (CLEAN & RE-INSERT) ---
    // =========================================================================
    
    // Pertama, pastikan produk ini beneran milik si user yang lagi login sebelum dihapus
    const { data: verifyProduct } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("user_id", session.user.id)
      .single();

    if (!verifyProduct) {
      return { success: false, error: "Produk tidak ditemukan atau Anda tidak memiliki akses." };
    }

    // Eksekusi Hapus Total Berdasarkan Product ID
    const { error: deleteMassalError } = await supabase
      .from("product_variations")
      .delete()
      .eq("product_id", productId);

    if (deleteMassalError) {
      return { success: false, error: `Gagal total membersihkan variasi lama: ${deleteMassalError.message}` };
    }

    // Jika ada data variasi baru dari form UI, langsung hantam insert masal
    if (variations.length > 0) {
      const payloadVariasiBaru = variations.map((v: any, index: number) => {
        const cleanVarName = v.name ? v.name.toUpperCase().replace(/[^A-Z0-9]/g, "_") : "VAR";
        const fallbackSku = sku ? `${sku}-${cleanVarName}` : `-${cleanVarName}`;

        return {
          product_id: productId,
          name: v.name || "Default",
          sku: v.sku && v.sku.trim() !== "" ? v.sku : fallbackSku,
          is_default: v.is_default || (index === 0),
          is_active: v.active !== undefined ? v.active : true,
          variant_image_url: v.mainImagePreview || v.variant_image_url || null,
          price: v.price && v.price !== "" ? Number(v.price) : Number(price),
          // Fallback ke nominal diskon produk utama kalau di tingkat variasi belum ditentukan nilainya
          discounted_price: v.discountedPrice && v.discountedPrice !== "" ? Number(v.discountedPrice) : discountedPrice,
          stock: v.quantity && v.quantity !== "" ? Number(v.quantity) : Number(stock),
          weight: v.weight && v.weight !== "" ? Number(v.weight) : Number(weight),
        };
      });

      const { error: insertMassalError } = await supabase
        .from("product_variations")
        .insert(payloadVariasiBaru);

      if (insertMassalError) {
        return { success: false, error: `Gagal memasukkan data variasi baru: ${insertMassalError.message}` };
      }
    }

    revalidatePath("/dashboard/products");
    return { success: true };

  } catch (error: any) {
    console.error("Unhandled Edit Server Action Error:", error);
    return { success: false, error: error.message || "Internal Server Error." };
  }
}
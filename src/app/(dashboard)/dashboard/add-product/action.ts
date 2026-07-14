"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
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

export async function createProductAction(formData: FormData) {
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
    return { success: false, error: "Unauthorized access. Silakan login kembali." };
  }

  try {
    const productType = formData.get("productType") as string;
    const listingType = formData.get("listingType") as string;
    const categoryId = formData.get("category") ? Number(formData.get("category")) : null;
    const brandId = formData.get("brand") ? Number(formData.get("brand")) : null;
    const externalLink = formData.get("externalLink") as string || null;
    const demoUrl = formData.get("demoUrl") as string || null;
    const isAffiliate = formData.get("is_affiliate") === "true";
    const rawRate = formData.get("affiliate_commission_rate");
    const affiliateCommissionRate = isAffiliate && rawRate ? Number(rawRate) : null;
    
    const titleEn = formData.get("titleEn") as string;
    const titleId = formData.get("titleId") as string || null;
    const descEn = formData.get("descEn") as string || null;
    const descId = formData.get("descId") as string || null;
    const sku = formData.get("sku") as string || null;

    const price = formData.get("price") ? Number(formData.get("price")) : 0;
    const discountRate = formData.get("discountRate") ? Number(formData.get("discountRate")) : 0;
    const discountedPrice = formData.get("discountedPrice") ? Number(formData.get("discountedPrice")) : null;
    const vatRate = formData.get("vatRate") ? Number(formData.get("vatRate")) : 0;
    const stock = formData.get("stock") ? Number(formData.get("stock")) : 1;

    // Data Logistik & Pengiriman baru
    const weight = formData.get("weight") ? Number(formData.get("weight")) : 0;
    const length = formData.get("length") ? Number(formData.get("length")) : 0;
    const width = formData.get("width") ? Number(formData.get("width")) : 0;
    const height = formData.get("height") ? Number(formData.get("height")) : 0;
    const deliveryTime = formData.get("deliveryTime") as string || null;

    const regularLicensePrice = formData.get("regularLicensePrice") ? Number(formData.get("regularLicensePrice")) : null;
    const extendedLicensePrice = formData.get("extendedLicensePrice") ? Number(formData.get("extendedLicensePrice")) : null;

    const optionsJson = formData.get("options") as string;
    const variationOptions = optionsJson ? JSON.parse(optionsJson) : [];

    const variationsJson = formData.get("variations") as string;
    const variations = variationsJson ? JSON.parse(variationsJson) : [];

    // 🌟 GENERATE SLUG SECARA OTOMATIS BERDASARKAN TITLE EN
    const productSlug = generateSlug(titleEn);

    // --- UPLOAD IMAGES ---
    const imageFiles = formData.getAll("images") as File[];
    const imageUrls: string[] = [];
    for (const file of imageFiles) {
      if (file.size === 0) continue;
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file);
      if (uploadError) return { success: false, error: `Gagal upload gambar: ${uploadError.message}` };
      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) imageUrls.push(publicUrlData.publicUrl);
    }

    // --- UPLOAD VIDEO PREVIEW ---
    let videoPreviewUrl = null;
    const videoFile = formData.get("videoPreview") as File;
    if (videoFile && videoFile.size > 0) {
      const videoName = `${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error: vidError } = await supabase.storage.from("product-videos").upload(videoName, videoFile);
      if (vidError) return { success: false, error: `Gagal upload video preview: ${vidError.message}` };
      videoPreviewUrl = supabase.storage.from("product-videos").getPublicUrl(videoName).data.publicUrl;
    }

    // --- UPLOAD AUDIO PREVIEW ---
    let audioPreviewUrl = null;
    const audioFile = formData.get("audioPreview") as File;
    if (audioFile && audioFile.size > 0) {
      const audioName = `${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error: audError } = await supabase.storage.from("product-audios").upload(audioName, audioFile);
      if (audError) return { success: false, error: `Gagal upload audio preview: ${audError.message}` };
      audioPreviewUrl = supabase.storage.from("product-audios").getPublicUrl(audioName).data.publicUrl;
    }

    // --- UPLOAD ASSET DIGITAL (.ZIP) ---
    let digitalFileUrl = null;
    if (productType === "digital") {
      const digitalFile = formData.get("digitalFile") as File;
      if (digitalFile && digitalFile.size > 0) {
        const digitalFileName = `${Date.now()}-${digitalFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: digitalUploadData, error: digitalUploadError } = await supabase.storage.from("digital-files").upload(digitalFileName, digitalFile);
        if (digitalUploadError) return { success: false, error: `Gagal upload file digital: ${digitalUploadError.message}` };
        digitalFileUrl = digitalUploadData.path;
      }
    }

    // --- INSERT TO PRODUCTS TABLE ---
    // --- INSERT TO PRODUCTS TABLE ---
    const { data: insertedProduct, error: insertError } = await supabase
      .from("products")
      .insert([
        {
          user_id: session.user.id,
          product_type: productType,
          listing_type: listingType,
          category_id: categoryId,
          brand_id: brandId,
          external_link: externalLink,
          demo_url: demoUrl,
          video_preview_url: videoPreviewUrl,
          audio_preview_url: audioPreviewUrl,
          title: titleEn,
          slug: productSlug, 
          title_lang2: titleId,
          description: descEn,
          description_lang2: descId,
          sku: sku,
          price: price,
          variation_options: variationOptions,
          discount_rate: discountRate,
          discounted_price: discountedPrice,
          vat_rate: vatRate,
          stock: stock,
          weight: weight,
          length: length,
          width: width,
          height: height,
          is_affiliate: isAffiliate,
        affiliate_commission_rate: affiliateCommissionRate,
          delivery_time: deliveryTime,
          regular_license_price: regularLicensePrice,
          extended_license_price: extendedLicensePrice,
          digital_file_url: digitalFileUrl,
          image_urls: imageUrls,

          // 🌟 TAMBAHKAN KELIMA BARIS INI BIAR DATA LOKASI MASUK KE SUPABASE:
          country: formData.get("country") as string || null,
          state: formData.get("state") as string || null,
          city: formData.get("cityId") as string || null, // Diambil dari key 'cityId' sesuai kiriman AddProductPage
          address: formData.get("address") as string || null,
          zip_code: formData.get("zipCode") as string || null,
        },
      ])
      .select()
      .single();

    if (insertError) return { success: false, error: `Database insert failed: ${insertError.message}` };

    // --- INSERT BULK VARIATIONS ---
    if (variations.length > 0 && insertedProduct) {
      const variationData = variations.map((v: any) => {
        const cleanVarName = v.name ? v.name.toUpperCase().replace(/[^A-Z0-9]/g, "_") : "VAR";
        const fallbackSku = insertedProduct.sku ? `${insertedProduct.sku}-${cleanVarName}` : `-${cleanVarName}`;
    
        return {
          product_id: insertedProduct.id,
          name: v.name || "Default",
          sku: v.sku && v.sku.trim() !== "" ? v.sku : fallbackSku,
          is_default: v.is_default || false, 
          is_active: v.active !== undefined ? v.active : true,
          variant_image_url: v.mainImagePreview || null,
          price: v.price && v.price !== "" ? Number(v.price) : Number(price),
          discounted_price: v.discountedPrice && v.discountedPrice !== "" ? Number(v.discountedPrice) : (formData.get("discountedPrice") ? Number(formData.get("discountedPrice")) : null),
          stock: v.quantity && v.quantity !== "" ? Number(v.quantity) : Number(stock),
          weight: v.weight && v.weight !== "" ? Number(v.weight) : Number(weight),
        };
      });
  
      const { error: varError } = await supabase.from("product_variations").insert(variationData);
      if (varError) return { success: false, error: `Produk tersimpan, tapi gagal menyimpan variasi: ${varError.message}` };
    }

    revalidatePath("/dashboard/products");
    return { success: true, productId: insertedProduct.id };

  } catch (error: any) {
    console.error("Unhandled Server Action Error:", error);
    return { success: false, error: error.message || "Internal Server Error." };
  }
}
import React from "react";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import EditFormWrapper from "./EditFormWrapper";

async function getProductForEdit(productId: string) {
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  // 1. Ambil data produk utama
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", Number(productId))
    .eq("user_id", session.user.id)
    .single();

  if (!product) return null;

  // 2. Ambil data variasi asli yang sudah tersimpan di database
  const { data: variations } = await supabase
    .from("product_variations")
    .select("*")
    .eq("product_id", product.id)
    .order("id", { ascending: true }); // Diurutkan berdasarkan ID agar posisinya stabil

  return {
    ...product,
    variations: variations || [],
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const resolvedParams = await params;
  const productData = await getProductForEdit(resolvedParams.id);

  if (!productData) {
    notFound(); // Lempar ke 404 jika produk ilegal/tidak ditemukan
  }

  // Petakan data mentah database agar siap dikonsumsi state Form Global
  const initialFormData = {
    id: productData.id,
    productType: productData.product_type,
    listingType: productData.listing_type,
    category: productData.category_id ? String(productData.category_id) : "",
    brand: productData.brand_id ? String(productData.brand_id) : "",
    externalLink: productData.external_link || "",
    demoUrl: productData.demo_url || "",
    titleEn: productData.title,
    titleId: productData.title_lang2 || "",
    descEn: productData.description || "",
    descId: productData.description_lang2 || "",
    sku: productData.sku || "",
    price: productData.price || 0,
    discountRate: productData.discount_rate || 0,
    discountedPrice: productData.discounted_price !== undefined ? productData.discounted_price : 0,
    stock: productData.stock || 1,
    weight: productData.weight || 0,
    length: productData.length || 0,
    width: productData.width || 0,
    height: productData.height || 0,
    deliveryTime: productData.delivery_time || "",
    
    // Data Lokasi Geografis Pengiriman
    country: productData.country || "",
    state: productData.state || "",
    cityId: productData.city || "",
    address: productData.address || "",
    zipCode: productData.zip_code || "",

    existingImages: productData.image_urls || [],
    images: [], 
    
    // Simpan blueprint opsi asli dan baris matriks variasi bawaan Supabase
    variations: productData.variations,
    variation_options: productData.variation_options || [],
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-8 font-sans">
      <div className="w-full mb-6">
        <h1 className="text-base font-bold text-slate-800 uppercase tracking-wide border-l-4 border-[#00a896] pl-2">
          Edit Product Listing
        </h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Modify your existing product and variation combinations</p>
      </div>

      <div className="w-full bg-white border border-slate-200 rounded-sm p-5 sm:p-8 shadow-2xs">
        <EditFormWrapper initialData={initialFormData} />
      </div>
    </div>
  );
}
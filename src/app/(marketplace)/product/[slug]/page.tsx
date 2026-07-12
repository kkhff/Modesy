import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ProductDetailClient from "./ProductDetailClient"; 

async function getProductDetail(slug: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  // Ambil data produk utama beserta relation profile vendor
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle(); // Menggunakan maybeSingle lebih aman daripada .single() agar tidak throw error fatal jika kosong

  if (productError) {
    console.error("Supabase Product Error:", productError.message);
  }

  if (!product) return null;

  // Ambil semua variasi pasangannya yang aktif
  const { data: variations, error: varError } = await supabase
    .from("product_variations")
    .select("*")
    .eq("product_id", product.id)
    .eq("is_active", true);

  if (varError) {
    console.error("Supabase Variations Error:", varError.message);
  }

  return {
    ...product,
    variations: variations || [],
  };
}

// 🌟 PERBAIKAN DI SINI: params di-unwrap dengan Promise agar kompatibel dengan Next.js terbaru
export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  // 🌟 Await params-nya dulu biar slug-nya kebaca string asli, bukan Promise!
  const resolvedParams = await params;
  
  const product = await getProductDetail(resolvedParams.slug);

  if (!product) {
    return (
      <div className="text-center py-20 font-sans text-sm text-slate-500">
        <p className="text-base font-bold text-slate-800 mb-2">Produk kagak ketemu</p>
        <p className="text-xs text-slate-400">Slug "{resolvedParams.slug}" tidak terdaftar di database.</p>
      </div>
    );
  }

  return <ProductDetailClient product={product} />;
}
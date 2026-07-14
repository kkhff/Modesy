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

  

  // 🌟 SEKARANG SUDAH MAJU: Ambil data produk utama, relation vendor, brand, dan review asli beserta data pembuat review
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(`
      *, 
      profiles(*),
      brands(name),
      wishlists(count),
      product_reviews(
  id,
  user_id, 
  rating, 
  review_text, 
  created_at, 
  profiles(first_name, last_name, avatar_url)
), product_comments(
      id,
      parent_id,
      comment_text,
      user_id,
      created_at,
      profiles(first_name, last_name)
    )
    `)
    .eq("slug", slug)
    .maybeSingle(); 

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

// Fungsi pembantu untuk mengambil data profil pembeli yang sedang login saat ini
async function getCurrentUserProfile() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  return profile;
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  
  // Ambil data produk dan profile pembeli secara paralel biar loading kilat
  const [product, currentUserProfile] = await Promise.all([
    getProductDetail(resolvedParams.slug),
    getCurrentUserProfile()
  ]);

  if (!product) {
    return (
      <div className="text-center py-20 font-sans text-sm text-slate-500">
        <p className="text-base font-bold text-slate-800 mb-2">Produk kagak ketemu</p>
        <p className="text-xs text-slate-400">Slug "{resolvedParams.slug}" tidak terdaftar di database.</p>
      </div>
    );
  }

  return (
    <ProductDetailClient 
      product={product} 
      currentUserProfile={currentUserProfile} 
    />
  );
}
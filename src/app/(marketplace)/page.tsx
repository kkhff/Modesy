import React from "react";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { blogsMock } from "@/lib/mockData"; // Tetap pakai mock untuk blog jika belum ada tabelnya
import { Heart, Star, Eye, ArrowRight, MessageSquare, Calendar } from "lucide-react";

// Interface data kategori dari DB
interface DbCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  image_url: string | null;
}

// Interface data brand dari DB
interface DbBrand {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  show_on_slider: boolean;
}

// Interface data produk dari DB Supabase
interface DbProduct {
  id: number;
  user_id: string;
  title: string;
  slug: string;
  price: number;
  discount_rate: number;
  discounted_price: number | null;
  stock: number;
  image_urls: string[] | null;
  is_promoted: boolean;
  created_at: string;
  rating: number | null;
  profiles?: {
    username: string | null;
  } | null;
}

// 1. Fetch data kategori dari Supabase
async function getHomepageCategories() {
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

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, image_url")
    .eq("status", true)
    .eq("show_on_homepage", true)
    .order("order_number", { ascending: true });

  if (error) {
    console.error("Gagal mengambil data kategori:", error.message);
    return [];
  }

  return (categories as DbCategory[]) || [];
}

// 2. Fetch data brand dari Supabase
async function getHomepageBrands() {
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

  const { data: brands, error } = await supabase
    .from("brands")
    .select("*")
    .eq("show_on_slider", true)
    .order("id", { ascending: true });

  if (error) {
    console.error("Gagal mengambil data brand:", error.message);
    return [];
  }

  return (brands as DbBrand[]) || [];
}

// 3. FETCH DATA PRODUK ASLI DARI DATABASE SUPABASE
async function getHomepageProducts() {
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

  const { data: products, error } = await supabase
    .from("products")
    .select("id, user_id, title, slug, price, discount_rate, discounted_price, stock, image_urls, is_promoted, created_at, rating")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data produk asli:", error.message);
    return [];
  }

  return (products as any[]) || [];
}

export default async function HomePage() {
  const homeCategory = await getHomepageCategories();
  const dbBrands = await getHomepageBrands();
  const allDbProducts = await getHomepageProducts();

  // Filter Data Berdasarkan Kondisi Asli Database
  const specialOffers = allDbProducts.filter(p => p.discount_rate && p.discount_rate > 0).slice(0, 4);
  const featuredProducts = allDbProducts.filter(p => p.is_promoted === true).slice(0, 4);
  const newArrivals = allDbProducts.slice(0, 4);

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen font-sans pb-16">
      
      {/* HERO SLIDER BANNER */}
      <div className="max-w-[1200px] mx-auto px-4 pt-6">
        <div className="w-full h-[380px] bg-gradient-to-r from-teal-700 to-[#00a896] rounded-sm relative overflow-hidden flex items-center p-8 md:p-16 text-white shadow-xs">
          <div className="max-w-[500px] space-y-4 z-10">
            <span className="bg-white/20 text-xs px-3 py-1 rounded-full uppercase font-bold tracking-wider">New Season</span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">Summer Fashion Top Lace Collection</h1>
            <p className="text-sm text-teal-100">Find your best lifestyle options with premium discount up to 50% only on this week.</p>
            <Link href="/products" className="inline-flex h-11 items-center bg-white text-teal-900 font-semibold px-6 rounded-sm text-sm hover:bg-teal-50 transition-colors shadow-xs">
              Shop Now
            </Link>
          </div>
          <div className="absolute right-[-10%] bottom-[-20%] w-[500px] h-[500px] bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute right-[10%] top-[-10%] w-[300px] h-[300px] bg-white/5 rounded-full pointer-events-none" />
        </div>
      </div>

      {/* SHOP BY CATEGORY */}
      <div className="max-w-[1200px] mx-auto px-4 pt-12">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">Shop By Category</h2>
          <Link href="/products" className="text-xs font-bold text-[#00a896] hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 justify-items-center">
          {homeCategory.map((cat) => (
            <Link 
              key={cat.id} 
              href={`/products/${cat.slug}`}
              className="rounded-sm p-3 flex flex-col items-center justify-center text-center group transition-all duration-200 hover:shadow-2xs cursor-pointer max-w-[180px]"
            >
              <div className="w-36 h-36 md:w-40 md:h-40 rounded-full overflow-hidden mb-4 border border-gray-100 relative bg-gray-50 flex items-center justify-center shadow-xs">
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                ) : (
                  <span className="text-3xl font-bold text-slate-300 uppercase select-none">{cat.name.substring(0, 2)}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-[#00a896] transition-colors line-clamp-2">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* SPECIAL OFFERS SECTION */}
      <div className="max-w-[1200px] mx-auto px-4 pt-12">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-xl font-bold text-gray-800">Special Offers</h2>
          <Link href="/products?filter=special-offers" className="text-xs font-bold text-[#00a896] hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {specialOffers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* BANNERS PROMO */}
      <div className="max-w-[1200px] mx-auto px-4 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="h-[180px] bg-gradient-to-r from-amber-500 to-orange-600 rounded-sm p-8 text-white flex flex-col justify-center space-y-2 relative overflow-hidden shadow-xs">
            <h3 className="text-xl font-bold">Exclusive Luxury Shoes</h3>
            <p className="text-xs text-orange-100 max-w-[280px]">Step confidently with authentic world-class designers sneakers and luxury shoes leather collection.</p>
            <Link href="/products?category=shoes" className="text-xs font-bold underline hover:text-orange-200 pt-2 block">Discover More</Link>
          </div>
          <div className="h-[180px] bg-gradient-to-r from-purple-600 to-indigo-700 rounded-sm p-8 text-white flex flex-col justify-center space-y-2 relative overflow-hidden shadow-xs">
            <h3 className="text-xl font-bold">Minimalist Living Room</h3>
            <p className="text-xs text-purple-100 max-w-[280px]">Upgrade your layout aesthetic house with geometric interior decoration tools, desks and premium pillows.</p>
            <Link href="/products?category=home-living" className="text-xs font-bold underline hover:text-purple-200 pt-2 block">Explore Trends</Link>
          </div>
        </div>
      </div>

      {/* FEATURED PRODUCTS SECTION */}
      <div className="max-w-[1200px] mx-auto px-4 pt-12">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-xl font-bold text-gray-800">Featured Products</h2>
          <Link href="/products?filter=featured" className="text-xs font-bold text-[#00a896] hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* NEW ARRIVALS SECTION */}
      <div className="max-w-[1200px] mx-auto px-4 pt-12">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-xl font-bold text-gray-800">New Arrivals</h2>
          <Link href="/products?filter=new-arrivals" className="text-xs font-bold text-[#00a896] hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* SHOP BY BRAND */}
      <div className="max-w-[1200px] mx-auto px-4 pt-12 overflow-hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Shop By Brand</h2>
        <div className="relative w-full overflow-hidden before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-16 before:bg-gradient-to-r before:from-[#f8f9fa] before:to-transparent after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-16 after:bg-gradient-to-l after:from-[#f8f9fa] after:to-transparent">
          <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused] cursor-pointer">
            {[...dbBrands, ...dbBrands].map((brand, idx) => (
              <Link 
                key={`${brand.id}-${idx}`} 
                href={`/products?brand=${brand.slug}`}
                className="bg-white border border-gray-200 w-[160px] h-[70px] sm:w-[180px] sm:h-[80px] rounded-sm p-3 flex items-center justify-center hover:border-[#00a896] transition-colors shrink-0 group shadow-2xs"
              >
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} className="max-h-full max-w-full object-contain opacity-60 group-hover:opacity-100 transition-all duration-200 grayscale group-hover:grayscale-0" />
                ) : (
                  <span className="text-xs font-bold text-slate-400">{brand.name}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* LATEST BLOG POSTS */}
      <div className="max-w-[1200px] mx-auto px-4 pt-12">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-xl font-bold text-gray-800">Latest From Blog</h2>
          <Link href="/blog" className="text-xs font-bold text-[#00a896] hover:underline flex items-center gap-1">
            View All Posts <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {blogsMock.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-sm overflow-hidden flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-full h-44 overflow-hidden bg-gray-50 relative">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                  <span className="absolute top-3 left-3 bg-[#00a896] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-xs shadow-xs">
                    {post.category}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> 0 Comments</span>
                  </div>
                  <Link href={`/blog/${post.slug}`} className="text-sm font-bold text-gray-800 hover:text-[#00a896] transition-colors block leading-snug">
                    {post.title}
                  </Link>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{post.excerpt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// 🌟 DIBERSIHKAN DARI CODES INTERAKTIF KLIEN AGAR AMAN DI RUNTIME SERVER COMPONENT
function ProductCard({ product }: { product: any }) {
  const price = Number(product.price) || 0;
  const dbDiscountedPrice = product.discounted_price !== null ? Number(product.discounted_price) : null;
  const hasDiscount = (product.discount_rate && product.discount_rate > 0) || (dbDiscountedPrice !== null && dbDiscountedPrice < price);
  const finalPrice = hasDiscount && dbDiscountedPrice !== null ? dbDiscountedPrice : price;

  const firstImage = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls[0] 
    : "https://placehold.co/400x500?text=No+Image";

  const vendorName = product.profiles?.username || "Official Store";

  return (
    <Link 
      href={`/product/${product.slug}`} 
      className="bg-white border border-gray-200 rounded-sm overflow-hidden relative shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer"
    >
      <div>
        {/* AREA GAMBAR UTAMA */}
        <div className="w-full aspect-[4/5] bg-gray-50 relative overflow-hidden">
          <img src={firstImage} alt={product.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
          
          {hasDiscount && product.discount_rate > 0 && (
            <span className="absolute top-3 left-3 bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-xs shadow-xs z-10">
              -{Math.round(product.discount_rate)}%
            </span>
          )}
          
          {/* TOMBOL HEART & EYE: Dipasangkan sebagai elemen visual murni tanpa handler onClick */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200 z-10">
            <div className="w-8 h-8 bg-white hover:bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 shadow-xs transition-colors">
              <Heart className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 bg-white hover:bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-[#00a896] shadow-xs transition-colors">
              <Eye className="w-4 h-4" />
            </div>
          </div>
        </div>
        
        {/* AREA KONTEN TEKS */}
        <div className="p-3.5 space-y-1">
          <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">{vendorName}</span>
          <h3 className="text-xs font-bold text-gray-800 group-hover:text-[#00a896] transition-colors line-clamp-2 min-h-[32px] leading-snug">
            {product.title}
          </h3>
          
          <div className="flex items-center gap-0.5 pt-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < (product.rating || 5) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} />
            ))}
            <span className="text-[10px] text-gray-400 ml-1">(0)</span>
          </div>
        </div>
      </div>

      {/* AREA PRICING */}
      <div className="p-3.5 pt-0">
        <div className="flex items-center gap-2 pt-1.5">
          <span className="text-sm font-bold text-gray-900">${finalPrice.toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">${price.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
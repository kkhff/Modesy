"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Eye, Star, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Interface tipe data murni Supabase
interface DbCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}

interface DbBrand {
  id: number;
  name: string;
  slug: string;
}

interface DbProduct {
  id: number;
  title: string;
  slug: string;
  price: number;
  discounted_price: number | null; // 🌟 SINKRON DENGAN KOLOM DATABASE BARU LU
  discount_rate: number | null;
  image_urls: string[];
  rating: number;
  is_promoted: boolean; // 🌟 SESUAIKAN DENGAN SKEMA ASLI BARIS INSERT LU (is_promoted, BUKAN is_featured)
  created_at: string;
  category_id: number;
  brand_id: number;
  profiles?: {
    username: string | null;
  } | null;
}

export default function ProductsCatalogPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  
  // Ambil data slug kategori dari URL Catch-all [[...category]]
  const categorySlugArray = (params?.category as string[]) || [];
  
  // Ambil parameter filter query (?filter=... atau ?brand=...)
  const filterParam = searchParams.get("filter");
  const brandParam = searchParams.get("brand");

  // State Data Master dari DB
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [dbBrands, setDbBrands] = useState<DbBrand[]>([]);

  // State untuk data produk hasil filter & Loading
  const [filteredProducts, setFilteredProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // State Filter Brand & Pencarian Brand lokal
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>(""); 

  // State Filter Harga & Rating
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // State Sorting
  const [sortBy, setSortBy] = useState<string>("newest");

  // --- EFFECT 1: Ambil Metadata Kategori & Brand Pas Pertama Load ---
  useEffect(() => {
    const fetchMetadata = async () => {
      const [catRes, brandRes] = await Promise.all([
        supabase.from("categories").select("id, name, slug, parent_id").eq("status", true),
        supabase.from("brands").select("id, name, slug")
      ]);

      if (!catRes.error && catRes.data) setDbCategories(catRes.data as DbCategory[]);
      if (!brandRes.error && brandRes.data) setDbBrands(brandRes.data as DbBrand[]);
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (brandParam) {
      const lowerBrand = brandParam.toLowerCase();
      if (!selectedBrands.includes(lowerBrand)) {
        setSelectedBrands([lowerBrand]);
      }
    }
  }, [brandParam]);

  // --- EFFECT 2: Main Logic Query & Filtering Real-time Supabase ---
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      setLoading(true);
      try {
        // 🌟 PERBAIKAN: Select disesuaikan dengan kolom database asli + join profiles(username)
        let query = supabase
          .from("products")
          .select("id, title, slug, price, discounted_price, discount_rate, image_urls, rating, is_promoted, created_at, category_id, brand_id");

        // --- FILTER KATEGORI BERTINGKAT (GRANDPARENT / PARENT / CHILD) ---
        if (categorySlugArray.length > 0 && dbCategories.length > 0) {
          const activeSlug = categorySlugArray[categorySlugArray.length - 1].toLowerCase();
          const targetCategory = dbCategories.find(c => c.slug.toLowerCase() === activeSlug);

          if (targetCategory) {
            const allowedCategoryIds: number[] = [targetCategory.id];

            // Cari anak tingkat 1 (Parent)
            const subCategories = dbCategories.filter(c => c.parent_id === targetCategory.id);
            subCategories.forEach(sub => {
              allowedCategoryIds.push(sub.id);
              // Cari anak tingkat 2 (Sub-sub Child)
              const subSubs = dbCategories.filter(c => c.parent_id === sub.id);
              subSubs.forEach(ss => allowedCategoryIds.push(ss.id));
            });

            query = query.in("category_id", allowedCategoryIds);
          }
        }

        // --- FILTER PARAM BRAND VIA URL DENGAN SLUG (?brand=...) ---
        if (brandParam && dbBrands.length > 0) {
          const targetBrand = dbBrands.find(b => b.slug.toLowerCase() === brandParam.toLowerCase());
          if (targetBrand) {
            query = query.eq("brand_id", targetBrand.id);
          }
        }

        // --- FILTER MULTI CHECKBOX BRAND VIA SIDEBAR ---
        if (selectedBrands.length > 0 && dbBrands.length > 0) {
          const targetBrandIds = dbBrands
            .filter(b => selectedBrands.includes(b.slug.toLowerCase()))
            .map(b => b.id);
          if (targetBrandIds.length > 0) {
            query = query.in("brand_id", targetBrandIds);
          }
        }

        // --- FILTER SPECIAL CORNER (?filter=...) ---
        if (filterParam === "special-offers") {
          query = query.gt("discount_rate", 0);
        } else if (filterParam === "featured") {
          query = query.eq("is_promoted", true); // 🌟 Ganti dari is_featured ke is_promoted
        }

        // --- FILTER HARGA & RATING ---
        if (minPrice !== "" && !isNaN(Number(minPrice))) query = query.gte("price", Number(minPrice));
        if (maxPrice !== "" && !isNaN(Number(maxPrice))) query = query.lte("price", Number(maxPrice));
        if (selectedRating !== null) query = query.gte("rating", selectedRating);

        // --- APPLIKASI SORTING DI LEVEL ENGINE DATABASE ---
        if (sortBy === "price-low-to-high") {
          query = query.order("price", { ascending: true });
        } else if (sortBy === "price-high-to-low") {
          query = query.order("price", { ascending: false });
        } else {
          query = query.order("created_at", { ascending: false });
        }

        const { data: products, error } = await query;
        if (!error && products) {
          setFilteredProducts(products as unknown as DbProduct[]);
        } else {
          console.error("Fetch catalog error:", error?.message);
          setFilteredProducts([]);
        }
      } catch (err) {
        console.error("Catalog Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredProducts();
  }, [params, searchParams, minPrice, maxPrice, selectedRating, selectedBrands, sortBy, dbCategories, dbBrands]);

  const handleClearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setSelectedRating(null);
    setSelectedBrands([]);
    setBrandSearchQuery("");
    setSortBy("newest");
  };

  const formatSlugText = (slug: string) => {
    return slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen font-sans pb-16">
      <div className="max-w-[1200px] mx-auto px-4 pt-5">
        
        {/* DYNAMIC BREADCRUMB */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 overflow-x-auto pb-2 sm:pb-0">
          <Link href="/" className="hover:text-[#00a896] shrink-0">Home</Link>
          <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
          <Link href="/products" className={`hover:text-[#00a896] shrink-0 ${categorySlugArray.length === 0 && !filterParam && !brandParam ? "text-gray-800 font-semibold" : ""}`}>
            Products
          </Link>

          {categorySlugArray.map((slug, index) => {
            const currentPath = `/products/${categorySlugArray.slice(0, index + 1).join("/")}`;
            const isLast = index === categorySlugArray.length - 1 && !filterParam && !brandParam;
            return (
              <React.Fragment key={index}>
                <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                <Link href={currentPath} className={`hover:text-[#00a896] shrink-0 ${isLast ? "text-gray-800 font-semibold cursor-default pointer-events-none" : ""}`}>
                  {formatSlugText(slug)}
                </Link>
              </React.Fragment>
            );
          })}

          {brandParam && (
            <>
              <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-gray-800 font-semibold shrink-0">Brand: {formatSlugText(brandParam)}</span>
            </>
          )}

          {filterParam && (
            <>
              <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-gray-800 font-semibold shrink-0">{formatSlugText(filterParam)}</span>
            </>
          )}
        </nav>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* SIDEBAR FILTER */}
          <aside className="w-full md:w-[240px] bg-white border border-gray-200 rounded-sm p-4 shrink-0 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-gray-700" />
                <h3 className="text-sm font-bold text-gray-800">Filters</h3>
              </div>
              {(minPrice || maxPrice || selectedRating !== null || selectedBrands.length > 0) && (
                <button onClick={handleClearFilters} className="text-[10px] font-semibold text-red-500 hover:underline flex items-center gap-0.5 cursor-pointer">
                  <X className="w-2.5 h-2.5" /> Clear All
                </button>
              )}
            </div>

            {/* Navigasi Kategori Dinamis */}
            <div className="space-y-2 border-b border-gray-100 pb-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-[10px]">Categories</h4>
              <div className="text-xs space-y-2 font-medium text-gray-600">
                {categorySlugArray.length === 0 ? (
                  dbCategories.filter(c => c.parent_id === null).map((cat) => (
                    <Link key={cat.id} href={`/products/${cat.slug}`} className="block hover:text-[#00a896] transition-colors py-0.5">
                      {cat.name}
                    </Link>
                  ))
                ) : (
                  <div className="space-y-2">
                    <Link href="/products" className="flex items-center gap-1 text-gray-400 hover:text-gray-600 font-semibold mb-3">
                      &larr; <span className="underline">All Categories</span>
                    </Link>
                    <div className="text-gray-900 font-bold border-l-2 border-[#00a896] pl-2 mb-2 text-sm">
                      {formatSlugText(categorySlugArray[0])}
                    </div>
                    <div className="pl-2 space-y-2 border-l border-gray-100">
                      {(() => {
                        const rootSlug = categorySlugArray[0].toLowerCase();
                        const matchedCat = dbCategories.find(c => c.slug.toLowerCase() === rootSlug);
                        if (!matchedCat) return null;

                        const subCategories = dbCategories.filter(c => c.parent_id === matchedCat.id);

                        if (categorySlugArray.length === 1) {
                          return subCategories.map(sub => (
                            <Link key={sub.id} href={`/products/${rootSlug}/${sub.slug}`} className="block hover:text-[#00a896] transition-colors">
                              {sub.name}
                            </Link>
                          ));
                        }

                        const subSlug = categorySlugArray[1].toLowerCase();
                        const matchedSub = subCategories.find(s => s.slug.toLowerCase() === subSlug);

                        if (matchedSub) {
                          const subSubCategories = dbCategories.filter(c => c.parent_id === matchedSub.id);
                          return (
                            <>
                              <Link href={`/products/${rootSlug}`} className="block text-[#00a896] font-semibold mb-1 text-[11px]">
                                &uarr; {matchedSub.name}
                              </Link>
                              {subSubCategories.map(subSub => (
                                <Link 
                                  key={subSub.id} 
                                  href={`/products/${rootSlug}/${subSlug}/${subSub.slug}`} 
                                  className={`block pl-2 hover:text-[#00a896] transition-colors ${
                                    categorySlugArray[2]?.toLowerCase() === subSub.slug.toLowerCase() ? "text-[#00a896] font-bold" : "text-gray-500"
                                  }`}
                                >
                                  {subSub.name}
                                </Link>
                              ))}
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FILTER BRAND */}
            <div className="space-y-2 border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between"><h4 className="text-xs font-bold text-gray-700">Brand</h4></div>
              <div className="h-8 w-full bg-white border border-gray-200 rounded-xs flex items-center px-2">
                <input type="text" placeholder="Search Brand" value={brandSearchQuery} onChange={(e) => setBrandSearchQuery(e.target.value)} className="w-full h-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-300" />
              </div>
              <div className="max-h-48 overflow-y-auto pt-1 space-y-2 pr-1 custom-scrollbar">
                {dbBrands
                  .filter((b) => b.name.toLowerCase().includes(brandSearchQuery.toLowerCase()))
                  .map((brand) => {
                    const isChecked = selectedBrands.includes(brand.slug.toLowerCase());
                    return (
                      <label key={brand.id} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-[#00a896] py-0.5">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) setSelectedBrands(selectedBrands.filter((slug) => slug !== brand.slug.toLowerCase()));
                            else setSelectedBrands([...selectedBrands, brand.slug.toLowerCase()]);
                          }}
                          className="w-3.5 h-3.5 rounded-xs border-gray-300 accent-[#00a896] cursor-pointer" 
                        />
                        <span>{brand.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
            
            {/* PRICE RANGE */}
            <div className="space-y-2 border-b border-gray-100 pb-4">
              <h4 className="text-xs font-bold text-gray-700">Price Range</h4>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full h-8 px-2 border border-gray-200 text-xs rounded-xs outline-none focus:border-[#00a896] bg-white" />
                <span className="text-gray-400 text-xs">-</span>
                <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full h-8 px-2 border border-gray-200 text-xs rounded-xs outline-none focus:border-[#00a896] bg-white" />
              </div>
            </div>

            {/* FILTER RATING */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-700">Rating</h4>
              {[5, 4, 3].map((star) => (
                <label key={star} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-[#00a896]">
                  <input type="checkbox" checked={selectedRating === star} onChange={() => setSelectedRating(selectedRating === star ? null : star)} className="rounded-xs border-gray-300 accent-[#00a896] cursor-pointer" />
                  <div className="flex text-amber-400 fill-amber-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < star ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`} />)}
                  </div>
                  <span>{star === 5 ? "5 Stars" : "& Up"}</span>
                </label>
              ))}
            </div>
          </aside>

          {/* MAIN PRODUCT GRID */}
          <main className="flex-1 w-full">
            <div className="bg-white border border-gray-200 rounded-sm p-4 mb-4 flex items-center justify-between text-xs text-gray-500">
              <p>Showing <span className="font-semibold text-gray-700">{filteredProducts.length}</span> results</p>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-200 p-1.5 bg-white rounded-xs outline-none cursor-pointer text-gray-700 font-medium">
                <option value="newest">Sort by: Newest</option>
                <option value="price-low-to-high">Price: Low to High</option>
                <option value="price-high-to-low">Price: High to Low</option>
              </select>
            </div>

            {loading ? (
              <div className="w-full bg-white border border-gray-200 rounded-sm p-12 text-center text-sm text-gray-400 animate-pulse">
                Loading products catalog...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="w-full bg-white border border-gray-200 rounded-sm p-12 text-center text-sm text-gray-400">
                No products found matching the selected criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProducts.map((product) => (
                  <CatalogProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// 🌟 SUBCOMPONENT CARD YANG SUDAH DISINKRONKAN DAN DI-LINK UTUH KE DETAIL PRODUCT
function CatalogProductCard({ product }: { product: DbProduct }) {
  const price = Number(product.price) || 0;
  const dbDiscountedPrice = product.discounted_price !== null ? Number(product.discounted_price) : null;
  const hasDiscount = (product.discount_rate && product.discount_rate > 0) || (dbDiscountedPrice !== null && dbDiscountedPrice < price);
  const finalPrice = hasDiscount && dbDiscountedPrice !== null ? dbDiscountedPrice : price;

  const mainImage = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls[0] 
    : "https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=400&auto=format&fit=crop";

  const vendorName = product.profiles?.username || "Official Store";

  return (
    <Link 
      href={`/product/${product.slug}`} 
      className="bg-white border border-gray-200 rounded-sm overflow-hidden relative shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer"
    >
      <div>
        {/* AREA GAMBAR UTAMA */}
        <div className="w-full aspect-[4/5] bg-gray-50 relative overflow-hidden">
          <img src={mainImage} alt={product.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
          
          {hasDiscount && product.discount_rate && product.discount_rate > 0 && (
            <span className="absolute top-3 left-3 bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-xs shadow-xs z-10">
              -{Math.round(product.discount_rate)}%
            </span>
          )}
          
          <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200 z-10">
            <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 shadow-xs transition-colors">
              <Heart className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-[#00a896] shadow-xs transition-colors">
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
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star, Heart, SlidersHorizontal, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DbProduct {
  id: number;
  title: string;
  slug: string;
  price: number;
  discounted_price: number | null;
  discount_rate: number | null;
  image_urls: string[];
  rating: number;
  is_promoted: boolean;
  category_id: number;
  categories: {
    id: number;
    name: string;
  } | null;
}

interface FilterCategory {
  id: number;
  name: string;
  count: number;
}

export default function VendorProfileProductsTab() {
  const params = useParams();
  const slug = params?.slug as string;
  const supabase = createClient();

  // State utama data
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // State internal filter sidebar
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState("most-recent");

  // --- EFFECT 1: Tarik Semua Produk Milik Vendor Berdasarkan Slug Profil ---
  useEffect(() => {
    if (!slug) return;

    const fetchVendorData = async () => {
      setLoading(true);
      try {
        // 1. Cari user_id vendor berdasarkan slug profilnya
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (!profile) return;

        // 2. Tarik semua produk milik user_id tersebut beserta nama kategorinya
        const { data: dbProducts } = await supabase
          .from("products")
          .select("id, title, slug, price, discounted_price, discount_rate, image_urls, rating, is_promoted, category_id, categories(id, name)")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false });

        if (dbProducts) {
          const typedProducts = dbProducts as unknown as DbProduct[];
          setProducts(typedProducts);
          setFilteredProducts(typedProducts);

          // 3. Ekstrak kategori unik yang dimiliki oleh produk vendor ini (untuk menu sidebar)
          const catMap = new Map<number, { name: string; count: number }>();
          typedProducts.forEach((p) => {
            if (p.categories) {
              const exist = catMap.get(p.categories.id);
              catMap.set(p.categories.id, {
                name: p.categories.name,
                count: exist ? exist.count + 1 : 1,
              });
            }
          });

          setCategories(
            Array.from(catMap.entries()).map(([id, item]) => ({
              id,
              name: item.name,
              count: item.count,
            }))
          );
        }
      } catch (err) {
        console.error("Gagal memuat produk toko vendor:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [slug]);

  // --- EFFECT 2: Jalankan Filter & Sort Secara Real-time Sisi Klien ---
  useEffect(() => {
    let result = [...products];

    // Filter Kategori
    if (selectedCategoryId !== null) {
      result = result.filter((p) => p.category_id === selectedCategoryId);
    }

    // Filter Keyword
    if (searchKeyword.trim() !== "") {
      result = result.filter((p) =>
        p.title.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    // Filter Rentang Harga (Berdasarkan harga final/diskon toko)
    if (minPrice !== "" && !isNaN(Number(minPrice))) {
      result = result.filter((p) => {
        const finalPrice = p.discounted_price !== null ? Number(p.discounted_price) : p.price;
        return finalPrice >= Number(minPrice);
      });
    }
    if (maxPrice !== "" && !isNaN(Number(maxPrice))) {
      result = result.filter((p) => {
        const finalPrice = p.discounted_price !== null ? Number(p.discounted_price) : p.price;
        return finalPrice <= Number(maxPrice);
      });
    }

    // Pemrosesan Sort Dropdown
    if (sortBy === "price-low-to-high") {
      result.sort((a, b) => {
        const pA = a.discounted_price !== null ? Number(a.discounted_price) : a.price;
        const pB = b.discounted_price !== null ? Number(b.discounted_price) : b.price;
        return pA - pB;
      });
    } else if (sortBy === "price-high-to-low") {
      result.sort((a, b) => {
        const pA = a.discounted_price !== null ? Number(a.discounted_price) : a.price;
        const pB = b.discounted_price !== null ? Number(b.discounted_price) : b.price;
        return pB - pA;
      });
    }

    setFilteredProducts(result);
  }, [selectedCategoryId, minPrice, maxPrice, searchKeyword, sortBy, products]);

  if (loading) {
    return <div className="text-center py-12 text-sm text-gray-400 animate-pulse">Loading vendor store items...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start w-full text-sm font-sans text-gray-700">
      
      {/* ================= SIDEBAR FILTERS (KIRI) ================= */}
      <aside className="w-full md:w-[240px] bg-white border border-gray-200 rounded-sm p-4 shrink-0 space-y-6">
        
        {/* Filter Kategori Toko */}
        <div className="space-y-2">
          <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Category</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto pt-1">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`block w-full text-left py-1 text-xs font-medium transition-colors ${
                selectedCategoryId === null ? "text-[#00a896] font-bold" : "text-gray-600 hover:text-[#00a896]"
              }`}
            >
              All Categories ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`block w-full text-left py-1 text-xs font-medium transition-colors ${
                  selectedCategoryId === cat.id ? "text-[#00a896] font-bold" : "text-gray-600 hover:text-[#00a896]"
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Filter Rentang Harga */}
        <div className="space-y-2">
          <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Price</h4>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full h-8 px-2 border border-gray-200 text-xs rounded-xs bg-white focus:outline-none focus:border-[#00a896]"
            />
            <span className="text-gray-400 text-xs">-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full h-8 px-2 border border-gray-200 text-xs rounded-xs bg-white focus:outline-none focus:border-[#00a896]"
            />
          </div>
        </div>

        {/* Filter Pencarian Kata Kunci */}
        <div className="space-y-2">
          <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Filter by keyword</h4>
          <div className="h-8 w-full bg-white border border-gray-200 rounded-xs flex items-center px-2 focus-within:border-[#00a896] pt-1">
            <input
              type="text"
              placeholder="Keyword..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full h-full bg-transparent text-xs outline-none text-gray-700"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </div>
        </div>
      </aside>

      {/* ================= GRID DATA PRODUK VENDOR (KANAN) ================= */}
      <main className="flex-1 w-full space-y-4">
        
        {/* Top Control Bar */}
        <div className="bg-white border border-gray-200 rounded-sm p-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span>Showing <span className="font-semibold text-gray-700">{filteredProducts.length}</span> items</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-200 p-1.5 bg-white rounded-xs outline-none text-gray-700 font-medium cursor-pointer"
          >
            <option value="most-recent">Most Recent</option>
            <option value="price-low-to-high">Price: Low to High</option>
            <option value="price-high-to-low">Price: High to Low</option>
          </select>
        </div>

        {/* List Grid Item */}
        {filteredProducts.length === 0 ? (
          <div className="w-full bg-white border border-gray-200 rounded-sm p-12 text-center text-xs text-gray-400">
            No items found listed in this vendor store.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <VendorCatalogCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Subkomponen Card Khusus Grid Halaman Profil Toko
function VendorCatalogCard({ product }: { product: DbProduct }) {
  const price = Number(product.price) || 0;
  const dbDiscountedPrice = product.discounted_price !== null ? Number(product.discounted_price) : null;
  const hasDiscount = (product.discount_rate && product.discount_rate > 0) || (dbDiscountedPrice !== null && dbDiscountedPrice < price);
  const finalPrice = hasDiscount && dbDiscountedPrice !== null ? dbDiscountedPrice : price;

  const mainImage = product.image_urls && product.image_urls.length > 0
    ? product.image_urls[0]
    : "https://placehold.co/400x500?text=No+Image";

  return (
    <Link
      href={`/product/${product.slug}`}
      className="bg-white border border-gray-200 rounded-sm overflow-hidden relative shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between group cursor-pointer"
    >
      <div>
        <div className="w-full aspect-[4/5] bg-gray-50 relative overflow-hidden">
          <img src={mainImage} alt={product.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
          
          {/* Badge Unggulan / Promoted */}
          {product.is_promoted && (
            <span className="absolute top-3 left-3 bg-green-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-xs shadow-xs uppercase tracking-wider z-10">
              Featured
            </span>
          )}

          {/* Badge Diskon nominal jika ada harga coret */}
          {hasDiscount && product.discount_rate && product.discount_rate > 0 && (
            <span className={`absolute top-3 bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-xs shadow-xs z-10 ${product.is_promoted ? "left-16" : "left-3"}`}>
              -{Math.round(product.discount_rate)}%
            </span>
          )}

          <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200 z-10">
            <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 shadow-xs transition-colors">
              <Heart className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="p-3.5 space-y-1">
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
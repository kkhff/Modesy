"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface CartItem {
  id: number;
  product_id: number;
  variation_id: number | null;
  quantity: number;
  products: {
    title: string;
    slug: string;
    price: number;
    discounted_price: number | null;
    discount_rate: number;
    image_urls: string[] | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
  product_variations: {
    name: string;
  } | null;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const supabase = createClient();

  // 1. Ambil data item keranjang belanja dari database
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("carts")
          .select(`
            id,
            product_id,
            variation_id,
            quantity,
            products (
              title,
              slug,
              price,
              discounted_price,
              discount_rate,
              image_urls,
              profiles (
                first_name,
                last_name
              )
            ),
            product_variations (
              name
            )
          `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setCartItems(data as unknown as CartItem[]);
      } catch (err) {
        console.error("Error fetching cart:", err);
        toast.error("Failed to load your cart.");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  // 2. Fungsi update quantity secara local + sinkronisasi ke Supabase
  const handleUpdateQuantity = async (id: number, newQty: number) => {
    if (newQty < 1) return;

    // Optimistic update di UI state biar cepet
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );

    try {
      const { error } = await supabase
        .from("carts")
        .update({ quantity: newQty })
        .eq("id", id);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to update quantity:", err);
      toast.error("Failed to sync quantity to server.");
    }
  };

  // 3. Fungsi menghapus item dari dalam keranjang belanja
  const handleRemoveItem = async (id: number) => {
    try {
      const { error } = await supabase.from("carts").delete().eq("id", id);
      if (error) throw error;

      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to remove item:", err);
      toast.error("Failed to remove item.");
    }
  };

  // 4. Kalkulasi kalkulator subtotal belanja otomatis
  const subtotalCost = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      if (!item.products) return acc;
      const price = Number(item.products.price) || 0;
      const discPrice = item.products.discounted_price !== null ? Number(item.products.discounted_price) : null;
      const finalPrice = item.products.discount_rate > 0 && discPrice !== null ? discPrice : price;
      return acc + finalPrice * item.quantity;
    }, 0);
  }, [cartItems]);

  if (loading) {
    return (
      <div className="w-full text-center py-20 font-sans text-xs text-slate-400 font-medium bg-[#f8f9fa]">
        Loading your cart items...
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen font-sans pb-16">
      <div className="max-w-[1200px] mx-auto px-4 pt-6">
        
        {/* BREADCRUMB */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 font-medium">
          <Link href="/" className="hover:text-[#00a896]">Home</Link>
          <span>/</span>
          <span className="text-slate-600 font-semibold">Shopping Cart</span>
        </nav>

        {/* PAGE HEADER COUNTER */}
        <h1 className="text-xl font-bold text-gray-800 mb-6">
          My Cart ({cartItems.length})
        </h1>

        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMN KIRI: DAFTAR ITEM DI KERANJANG */}
            <div className="lg:col-span-8 space-y-4">
              {cartItems.map((item) => {
                if (!item.products) return null;

                const basePrice = Number(item.products.price) || 0;
                const discPrice = item.products.discounted_price !== null ? Number(item.products.discounted_price) : null;
                const singlePrice = item.products.discount_rate > 0 && discPrice !== null ? discPrice : basePrice;
                const totalItemCost = singlePrice * item.quantity;

                const thumbnail = item.products.image_urls && item.products.image_urls.length > 0
                  ? item.products.image_urls[0]
                  : "https://placehold.co/150x180";

                const sellerName = item.products.profiles?.first_name
                  ? `${item.products.profiles.first_name} ${item.products.profiles.last_name || ""}`.trim()
                  : "Official Store";

                return (
                  <div 
                    key={item.id} 
                    className="bg-white border border-gray-200 rounded-xs p-4 flex flex-col sm:flex-row justify-between gap-4 shadow-3xs"
                  >
                    <div className="flex gap-4 items-start">
                      {/* Gambar Mini Produk */}
                      <div className="w-20 h-24 border border-gray-100 rounded-xs bg-gray-50 overflow-hidden shrink-0">
                        <img src={thumbnail} alt={item.products.title} className="w-full h-full object-cover" />
                      </div>

                      {/* Info Teks Detail Produk */}
                      <div className="space-y-1">
                        <Link 
                          href={`/product/${item.products.slug}`}
                          className="text-xs font-bold text-gray-800 hover:text-[#00a896] transition-colors leading-snug block"
                        >
                          {item.products.title}
                        </Link>
                        
                        {/* Render Varian Dinamis Jika Ada */}
                        {item.product_variations?.name && (
                          <p className="text-[11px] text-slate-700 font-semibold">
                            Options: <span className="text-slate-500 font-medium">{item.product_variations.name}</span>
                          </p>
                        )}

                        <p className="text-[11px] text-slate-400 font-medium">
                          Seller: <span className="text-[#00a896] font-bold hover:underline cursor-pointer">{sellerName}</span>
                        </p>

                        {/* Rincian Harga Blok Bawah */}
                        <div className="pt-2 text-xs font-semibold space-y-0.5">
                          <div className="flex gap-4">
                            <span className="text-slate-400 w-16">Unit Price:</span>
                            <span className="text-slate-800 font-bold">${singlePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-slate-400 w-16">Total:</span>
                            <span className="text-slate-900 font-extrabold">${totalItemCost.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Tombol Aksi Hapus Item */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-6 px-2.5 border border-gray-200 hover:border-rose-300 text-slate-500 hover:text-rose-500 rounded-xs text-[10px] font-bold flex items-center gap-1 cursor-pointer bg-white transition-colors"
                          >
                            <X className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sisi Kanan: Selektor Jumlah Quantity */}
                    <div className="flex items-start sm:justify-end">
                      <div className="flex items-center border border-gray-200 rounded-xs bg-gray-50 h-8 shrink-0 shadow-3xs">
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} 
                          className="w-8 h-full flex items-center justify-center font-bold text-slate-500 hover:bg-gray-100 cursor-pointer"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          value={item.quantity} 
                          readOnly 
                          className="w-10 h-full text-center text-xs font-bold bg-white border-x border-gray-200 text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        />
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} 
                          className="w-8 h-full flex items-center justify-center font-bold text-slate-500 hover:bg-gray-100 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* COLUMN KANAN: SUMMARY TOTAL & KUPON DISKON */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* Box Rincian Pembayaran */}
              <div className="bg-white border border-gray-200 rounded-xs p-5 shadow-3xs space-y-4 font-semibold text-xs">
                <div className="flex justify-between items-center text-slate-500 py-1 border-b border-slate-50">
                  <span>Subtotal</span>
                  <span className="text-gray-900 font-extrabold text-sm">${subtotalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-800 py-1">
                  <span>Total</span>
                  <span className="text-gray-900 font-extrabold text-sm">${subtotalCost.toFixed(2)}</span>
                </div>
                
                <div className="pt-2">
                  <Link 
                    href="/cart/checkout"
                    className="w-full h-10 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center justify-center uppercase tracking-wider transition-all shadow-2xs"
                  >
                    Continue to Checkout
                  </Link>
                </div>
              </div>

              {/* Box Kupon Potongan Harga */}
              <div className="bg-white border border-gray-200 rounded-xs p-5 shadow-3xs space-y-3">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Discount Coupon
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Coupon Code"
                    className="flex-1 border border-gray-200 rounded-xs px-3 h-9 text-xs bg-white outline-none focus:border-[#00a896] text-slate-700 shadow-3xs placeholder-gray-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => toast.error("Coupon code code is invalid or expired.")}
                    className="h-9 px-4 bg-[#00a896] hover:bg-[#009282] text-white font-bold text-xs rounded-xs transition-colors cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* KONDISI KERANJANG BELANJA KOSONG */
          <div className="w-full bg-white border border-gray-200 p-12 rounded-xs text-center shadow-3xs">
            <p className="text-sm text-slate-400 italic">Your shopping cart is empty.</p>
            <Link 
              href="/products" 
              className="mt-4 inline-block text-xs font-bold text-white bg-[#00a896] hover:bg-[#009282] px-6 h-9 leading-9 rounded-xs transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
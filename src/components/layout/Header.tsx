"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MapPin, Search, ShoppingCart, User, LogOut, LayoutDashboard, Settings, ShoppingBag, MessageSquare, RefreshCw, FileText, Wallet, ShoppingBasket, Tag, MessageSquareText, Layers } from "lucide-react";
import LocationModal from "@/components/modals/LocationModal";
import { FlagImage } from 'react-international-phone';
import LoginModal from "@/components/modals/Login";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- INTERFACE UNTUK STRUKTUR DATA KATEGORI 3 TINGKAT DARI DB ---
interface SubSubCategory {
  id: number;
  name: string;
  slug: string;
}

interface SubCategory {
  id: number;
  name: string;
  slug: string;
  subSubCategories: SubSubCategory[];
}

interface MegaCategory {
  id: number;
  name: string;
  slug: string;
  subCategories: SubCategory[];
}

interface UserProfile {
  first_name: string;
  last_name: string;
  slug: string;
  role: "member" | "vendor" | "moderator" | "admin";
  avatar_url: string | null;
}

export default function Header() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  
  // State Data Kategori Dinamis dari Supabase
  const [categories, setCategories] = useState<MegaCategory[]>([]);
  
  // State Autentikasi User & Profil
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  // --- EFEK UTAMA: LOAD DATA KATEGORI & AUTH STATUS ---
  useEffect(() => {
    // 1. Ambil data kategori dari Supabase
    const fetchCategories = async () => {
      const { data: dbCategories, error } = await supabase
        .from("categories")
        .select("*")
        .eq("status", true)
        .order("order_number", { ascending: true });

      if (error) {
        console.error("Gagal memuat kategori:", error.message);
        return;
      }

      if (dbCategories) {
        const grandParents = dbCategories.filter(c => c.parent_id === null);
        
        const structuredData = grandParents.map(gp => {
          const parents = dbCategories.filter(c => c.parent_id === gp.id);
          
          const subCategories = parents.map(p => {
            const subSubs = dbCategories.filter(c => c.parent_id === p.id);
            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              subSubCategories: subSubs.map(ss => ({ id: ss.id, name: ss.name, slug: ss.slug }))
            };
          });

          return {
            id: gp.id,
            name: gp.name,
            slug: gp.slug,
            subCategories: subCategories
          };
        });

        setCategories(structuredData);
      }
    };

    fetchCategories();

    // 2. Ambil data session user
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) fetchUserProfile(session.user.id);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name, role, slug, avatar_url")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data as UserProfile);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged out successfully");
      router.push("/");
      router.refresh();
    }
  };

  // Fungsi navigasi profil yang aman dari kondisi balapan data (race condition)
  const handleProfileNavigation = () => {
    if (profile && profile.slug) {
      router.push(`/profile/${profile.slug}`);
    } else {
      toast.error("Memuat profil, silakan coba lagi...");
    }
  };

  return (
    <header className="w-full bg-white font-sans border-b border-gray-200 top-0 z-50">
      {/* ================= FLOOR 1: TOP BAR ================= */}
      <div className="w-full bg-[#f8f9fa] border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 h-9 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <Link href="/contact" className="text-base">Contact</Link>
            <Link href="/sell" className="text-base">Sell on Modesy</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsLocationOpen(true)}
              className="flex items-center gap-1.5 text-base text-slate-500 font-medium cursor-pointer"
            >
              <MapPin className="size-4 text-slate-500" /> 
              <span>{currentLocation || "Location"}</span>
            </button>

            <Select>
              <SelectTrigger className="w-full border-none justify-center cursor-pointer">
                <SelectValue placeholder="USD ($)" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-300">
                {["USD ($)", "EUR (€)", "BRL (R$)", "GBP (£)", "IDR (Rp)", "INR (₹)", "NGN (₦)", "RUB (₽)", "TRY (₺)"].map((cur) => (
                  <SelectItem key={cur} value={cur} className="text-slate-500 !w-full !justify-center text-center cursor-pointer">
                    {cur}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger className="w-full border-none cursor-pointer">
                <SelectValue placeholder="English" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-300">
                <SelectItem value="English" className="text-slate-500 cursor-pointer">
                    <FlagImage iso2="us" style={{ width: '20px', marginRight: '6px', display: 'inline' }} /> English
                </SelectItem>
                <SelectItem value="Arabic" className="text-slate-500 cursor-pointer">
                    <FlagImage iso2="sa" style={{ width: '20px', marginRight: '6px', display: 'inline' }} /> Arabic
                </SelectItem>
              </SelectContent>
            </Select>

            {user && profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 cursor-pointer focus:outline-none py-1">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-5 h-5 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-3 h-3 text-gray-500" />
                    </div>
                  )}
                  <span className="text-base font-medium text-gray-700 hover:text-[#00a896] transition-colors">
                    {profile.first_name}
                  </span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-md rounded-sm p-1 font-sans" align="end">
                  {profile.role === "admin" && (
                     <>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/panel")}>
                      <Layers className="w-4 h-4 mr-2" /> Admin Panel 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/admin")}>
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard 
                    </DropdownMenuItem>
                    {/* 🌟 FIX AMAN: Menggunakan fungsi handleProfileNavigation agar anti-undefined */}
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={handleProfileNavigation}>
                      <User className="w-4 h-4 mr-2" /> Profile 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/wallet")}>
                      <Wallet className="w-4 h-4 mr-2" /> Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/messages")}>
                      <MessageSquareText className="w-4 h-4 mr-2" /> Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/settings/edit-profile")}>
                      <Settings className="w-4 h-4 mr-2" /> Profile Settings
                    </DropdownMenuItem>
                    </>
                  )}
                  {profile.role === "moderator" && (
                    <>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/panel")}>
                      <Layers className="w-4 h-4 mr-2" /> Admin Panel 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/orders")}>
                      <ShoppingBasket className="w-4 h-4 mr-2" /> Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/coupons")}>
                      <Tag className="w-4 h-4 mr-2" /> My Coupons
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={handleProfileNavigation}>
                      <User className="w-4 h-4 mr-2" /> Profile 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/wallet")}>
                      <Wallet className="w-4 h-4 mr-2" /> Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/messages")}>
                      <MessageSquareText className="w-4 h-4 mr-2" /> Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/settings/edit-profile")}>
                      <Settings className="w-4 h-4 mr-2" /> Profile Settings
                    </DropdownMenuItem>
                    </>
                  )}
                  {profile.role === "vendor" && (
                    <>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/dashboard")}>
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={handleProfileNavigation}>
                      <User className="w-4 h-4 mr-2" /> Profile 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/wallet")}>
                      <Wallet className="w-4 h-4 mr-2" /> Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/orders")}>
                      <ShoppingBasket className="w-4 h-4 mr-2" /> Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/coupons")}>
                      <Tag className="w-4 h-4 mr-2" /> My Coupons
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/messages")}>
                      <MessageSquareText className="w-4 h-4 mr-2" /> Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/settings/edit-profile")}>
                      <Settings className="w-4 h-4 mr-2" /> Profile Settings
                    </DropdownMenuItem>
                    </>
                  )}
                  {profile.role === "member" && (
                    <>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={handleProfileNavigation}>
                      <User className="w-4 h-4 mr-2" /> Profile 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/wallet")}>
                      <Wallet className="w-4 h-4 mr-2" /> Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/orders")}>
                      <ShoppingBasket className="w-4 h-4 mr-2" /> Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/coupons")}>
                      <Tag className="w-4 h-4 mr-2" /> My Coupons
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/messages")}>
                      <MessageSquareText className="w-4 h-4 mr-2" /> Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs" onClick={() => router.push("/settings/edit-profile")}>
                      <Settings className="w-4 h-4 mr-2" /> Profile Settings
                    </DropdownMenuItem>
                    </>
                  )}
                  
                  {(profile.role === "admin" || profile.role === "moderator" || profile.role === "vendor") && <DropdownMenuSeparator className="bg-gray-100" />}
                  
                  <DropdownMenuSeparator className="bg-gray-100" />
                  
                  <DropdownMenuItem className="text-gray-600 focus:bg-red-50 focus:text-red-600 font-medium cursor-pointer rounded-xs" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => setIsLoginOpen(true)} className="text-base cursor-pointer hover:text-[#00a896] transition-colors">
                  Login
                </button>
                <span className="text-base px-1">/</span>
                <Link href="/auth/register" className="text-base hover:text-[#00a896] transition-colors">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= FLOOR 2: MAIN SEARCH BAR ================= */}
      <div className="w-full bg-white">
        <div className="max-w-[1200px] mx-auto px-4 h-20 flex items-center gap-4 justify-between">
          <div className="text-5xl font-bold tracking-tight text-[#222] cursor-pointer shrink-0" onClick={() => router.push("/")}>
            M<span className="text-[#00a896]">o</span>desy
          </div>

          <div className="flex-1 max-w-[650px] mx-4 flex items-center rounded-sm overflow-hidden h-11 bg-slate-100 shadow-xs">
            <input 
              type="text" 
              placeholder="Search for products, categories or brand" 
              className="w-full h-full px-4 text-sm border-none placeholder:text-gray-400 focus:outline-none bg-slate-100"
            />
            <button className="h-full px-5 text-slate-400 bg-slate-100 flex items-center justify-center cursor-pointer">
              <Search/>
            </button>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <Link href="/cart" className="flex items-center gap-1.5 p-2 text-gray-500 hover:text-[#00a896] transition-colors">
              <ShoppingCart className="size-7"/> <span>Cart</span>
            </Link>
            <Link href="/wishlist" className="flex items-center gap-1.5 p-2 text-gray-500 hover:text-[#00a896] transition-colors">
              <Heart className="size-7"/> <span>Wishlist</span>
            </Link>

            <Button 
              className="bg-[#00a896] hover:bg-[#009282] text-white rounded-sm h-10 px-5 text-xs font-semibold shadow-xs cursor-pointer"
              onClick={() => {
                if (!user) setIsLoginOpen(true);
                else router.push("/sell");
              }}
            >
              Sell Now
            </Button>
          </div>
        </div>
      </div>

      {/* ================= FLOOR 3: DYNAMIC MEGA MENU NAVIGATION ================= */}
      <div className="w-full bg-white border-t border-gray-100 hidden lg:block relative">
        <div className="max-w-[1200px] mx-auto px-4 h-11 flex items-center gap-6 text-sm font-medium text-gray-700">
          {categories.map((category) => (
            <div 
              key={category.id} 
              className="h-full flex items-center border-b-2 border-transparent hover:border-[#00a896] hover:text-[#00a896] transition-all duration-150 cursor-pointer text-[13px]"
              onMouseEnter={() => setActiveCategory(category.id)}
              onMouseLeave={() => setActiveCategory(null)}
            >
              <Link href={`/products/${category.slug}`} className="h-full flex items-center">
                {category.name}
              </Link>

              {/* Mega Menu Overlay Dropdown */}
              {activeCategory === category.id && category.subCategories && category.subCategories.length > 0 && (
                <div className="absolute top-11 left-0 w-full bg-white border-b border-gray-200 shadow-lg p-6 grid grid-cols-4 gap-6 text-left z-50">
                  
                  {/* Loop Sub Kategori (Kolom Vertikal) */}
                  {category.subCategories.map((subCat) => (
                    <div key={subCat.id} className="space-y-2">
                      <Link 
                        href={`/products/${category.slug}/${subCat.slug}`}
                        className="text-xs font-bold text-gray-900 hover:text-[#00a896] block border-b border-gray-100 pb-1"
                      >
                        {subCat.name}
                      </Link>
                      
                      {/* Loop Sub-Sub Kategori (List Kecil di Bawahnya) */}
                      {subCat.subSubCategories && subCat.subSubCategories.length > 0 && (
                        <div className="space-y-1.5 pl-0.5">
                          {subCat.subSubCategories.map((subSubCat) => (
                            <Link
                              key={subSubCat.id}
                              href={`/products/${category.slug}/${subCat.slug}/${subSubCat.slug}`}
                              className="text-xs text-gray-500 hover:text-[#00a896] block font-medium transition-colors"
                            >
                              {subSubCat.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Banner Promo Samping kanan dalam Mega Menu */}
                  <div className="col-span-1 border-l border-gray-100 pl-6 flex flex-col justify-center bg-gray-50/70 p-4 rounded-xs">
                    <h4 className="text-xs font-bold text-gray-800 mb-1">Trending Hot Deals</h4>
                    <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">Get extra discount cashback vouchers up to 25% for {category.name} collection.</p>
                    <Link href={`/products/${category.slug}`} className="text-[11px] text-[#00a896] font-bold hover:underline">View All &rarr;</Link>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <LocationModal isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} onSelectLocation={(loc) => setCurrentLocation(loc)} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onSwitchToRegister={() => router.push("/auth/register")} />
    </header>
  );
}
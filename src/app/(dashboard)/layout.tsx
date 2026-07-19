"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Home, UploadCloud, ShoppingCart, 
  DollarSign, Link as LinkIcon,
  Star, Settings, FileText, Truck, Menu, ChevronDown,
  StickyNote,
  ShoppingBasket,
  Ticket,
  Flag,
  CreditCard,
  MessagesSquare,
  Circle,
  Tag,
  User,
  LogOut,
  Eye
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SubItem {
  name: string;
  href: string;
}

interface MenuItem {
  name: string;
  href?: string;
  icon: React.ComponentType<any>;
  hasSub?: boolean;
  subItems?: SubItem[];
}

interface MenuGroup {
  groupName: string;
  items: MenuItem[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // State dinamis untuk menampung data user & profil dari Supabase
  const [userProfile, setUserProfile] = useState<{ first_name: string; role: string; avatar_url: string | null } | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  // Fetch Session & Data Profil Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("first_name, role, avatar_url")
          .eq("id", session.user.id)
          .single();
        if (data) setUserProfile(data);
      }
    };
    fetchProfile();
  }, []);

  // Handler fungsi Logout
  const handleDashboardLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged out successfully");
      router.push("/");
      router.refresh();
    }
  };

  // Struktur navigasi Modesy
  const menuGroups: MenuGroup[] = [
    {
      groupName: "Navigation",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: Home }
      ]
    },
    {
      groupName: "Products",
      items: [
        { name: "Add Product", href: "/dashboard/add-product", icon: StickyNote },
        { name: "Bulk Product Upload", href: "/dashboard/bulk-upload", icon: UploadCloud },
        { 
          name: "Products", 
          icon: ShoppingBasket, 
          hasSub: true,
          subItems: [
            { name: "Products", href: "/dashboard/products" },
            { name: "Pending Products", href: "/dashboard/pending-products" },
            { name: "Hidden Products", href: "/dashboard/hidden-products" },
            { name: "Drafts", href: "/dashboard/drafts" }
          ]
        }
      ]
    },
    {
      groupName: "Sales",
      items: [
        { 
          name: "Sales", 
          icon: ShoppingCart, 
          hasSub: true,
          subItems: [
            { name: "Active Sales", href: "/dashboard/sales/active" },
            { name: "Invoices", href: "/dashboard/sales/invoices" }
          ]
        },
        { name: "Quote Requests", href: "/dashboard/quote-requests", icon: Tag },
        { name: "Coupons", href: "/dashboard/coupons", icon: Ticket },
        { name: "Refund Requests", href: "/dashboard/refund-requests", icon: Flag },
        { name: "Cash on Delivery", href: "/dashboard/cod", icon: DollarSign }
      ]
    },
    {
      groupName: "Payments",
      items: [
        { 
          name: "Payments", 
          icon: CreditCard, 
          hasSub: true,
          subItems: [
            { name: "Payment History", href: "/dashboard/payments/history" },
            { name: "Payout Settings", href: "/dashboard/payments/settings" }
          ]
        }
      ]
    },
    {
      groupName: "Affiliate Program",
      items: [
        { name: "Affiliate Program", href: "/dashboard/affiliate", icon: LinkIcon }
      ]
    },
    {
      groupName: "Comments",
      items: [
        { name: "Comments", href: "/dashboard/comments", icon: MessagesSquare },
        { name: "Reviews", href: "/dashboard/reviews", icon: Star }
      ]
    },
    {
      groupName: "Settings",
      items: [
        { name: "Shop Settings", href: "/dashboard/shop-settings", icon: Settings },
        { name: "Shop Policies", href: "/dashboard/policies", icon: FileText },
        { name: "Shipping Settings", href: "/dashboard/shipping", icon: Truck }
      ]
    }
  ];

  // SUB-MENU TERBUKA OTOMATIS
  useEffect(() => {
    const updatedDropdowns: Record<string, boolean> = {};
    
    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.hasSub && item.subItems) {
          const isChildActive = item.subItems.some((sub) => pathname === sub.href);
          if (isChildActive) {
            updatedDropdowns[item.name] = true;
          }
        }
      });
    });

    setOpenDropdowns((prev) => ({ ...prev, ...updatedDropdowns }));
  }, [pathname]);

  const toggleDropdown = (menuName: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    setOpenDropdowns((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-slate-600 antialiased">
      
      {/* ========================================================================= */}
      {/* SIDEBAR UTAMA */}
      {/* ========================================================================= */}
      <aside 
        className={`bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo Modesy */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-slate-100 shrink-0">
          {!isCollapsed ? (
            <Link href="/" className="text-4xl font-extrabold tracking-tight text-slate-800">
              M<span className="text-[#00a896]">o</span>desy
            </Link>
          ) : (
            <div className="text-xl font-black text-[#00a896] mx-auto">M.</div>
          )}
        </div>

        {/* Info Profil Kiri Terhubung Supabase */}
        {!isCollapsed && (
          <div className="p-4 flex flex-col items-center border-b border-slate-50 shrink-0">
            <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden mb-2 border border-slate-200 flex items-center justify-center">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Vendor Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium">Hi,</span>
            <span className="text-xs font-bold text-slate-800 capitalize">
              {userProfile?.first_name || "User"}
            </span>
          </div>
        )}

        {/* List Navigasi Item Menu Accordion */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4 custom-scrollbar">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                  {group.groupName}
                </span>
              )}
              
              {group.items.map((item, iIdx) => {
                const Icon = item.icon;
                const isDropdownOpen = !!openDropdowns[item.name];
                const isParentActive = item.href ? pathname === item.href : item.subItems?.some(sub => pathname === sub.href);

                if (item.hasSub) {
                  return (
                    <div key={iIdx} className="space-y-1">
                      <button
                        onClick={() => toggleDropdown(item.name)}
                        className={`w-full flex items-center rounded-sm transition-all group py-2.5 px-3 cursor-pointer text-left relative ${
                          isParentActive 
                            ? "bg-slate-50 text-[#00a896] font-semibold" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        } ${isCollapsed ? "justify-center" : "justify-between"}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 shrink-0 ${isParentActive ? "text-[#00a896]" : "text-slate-400 group-hover:text-slate-600"}`} />
                          {!isCollapsed && <span className="text-xs">{item.name}</span>}
                        </div>

                        {!isCollapsed && (
                          <ChevronDown 
                            className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-200 ${
                              isDropdownOpen ? "transform rotate-180 text-[#00a896]" : ""
                            }`} 
                          />
                        )}

                        {isCollapsed && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-medium rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                            {item.name}
                          </div>
                        )}
                      </button>

                      {isDropdownOpen && !isCollapsed && item.subItems && (
                        <div className="pl-4 space-y-0.5 border-l border-slate-100 ml-5 animate-fade-in">
                          {item.subItems.map((sub, sIdx) => {
                            const isChildActive = pathname === sub.href;
                            return (
                              <Link
                                key={sIdx}
                                href={sub.href}
                                className={`flex items-center gap-2 py-2 px-3 text-[11px] rounded-sm transition-colors ${
                                  isChildActive 
                                    ? "text-[#00a896] font-bold bg-teal-50/40" 
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                }`}
                              >
                                <Circle className={`w-1.5 h-1.5 ${isChildActive ? "text-[#00a896] fill-[#00a896]" : "text-slate-300"}`} />
                                {sub.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={iIdx}
                    href={item.href || "#"}
                    className={`flex items-center rounded-sm transition-all group py-2.5 px-3 relative ${
                      isParentActive 
                        ? "bg-slate-50 text-[#00a896] font-semibold" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${isCollapsed ? "justify-center" : "justify-between"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${isParentActive ? "text-[#00a896]" : "text-slate-400 group-hover:text-slate-600"}`} />
                      {!isCollapsed && <span className="text-xs">{item.name}</span>}
                    </div>

                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-medium rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* SISI KANAN: TOPBAR & CONTENT AREA */}
      {/* ========================================================================= */}
      <div 
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ paddingLeft: isCollapsed ? "4rem" : "16rem" }}
      >
        
        {/* TOPBAR UTAMA DASHBOARD */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-slate-50 rounded-sm text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 text-xs font-semibold">
            {/* View Site Button */}
            <Link href="/" className="bg-[#00a896] hover:bg-[#009282] text-white px-4 h-9 flex items-center gap-1.5 rounded-sm transition-colors">
              <Eye className="w-4 h-4" />
              <span>View Site</span>
            </Link>

            {/* Dropdown Bahasa Terstruktur */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-slate-600 cursor-pointer hover:text-slate-900 flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-sm border border-slate-100 focus:outline-none">
                <span>English</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border border-slate-200 shadow-sm rounded-sm p-1 font-sans text-xs">
                <DropdownMenuItem className="text-slate-600 cursor-pointer focus:bg-slate-50">English</DropdownMenuItem>
                <DropdownMenuItem className="text-slate-600 cursor-pointer focus:bg-slate-50">Arabic</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-slate-200 mx-1" />

            {/* Dropdown Profil (Struktur Murni Copy-Paste Belajar dari Header Lama Kamu) */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 cursor-pointer focus:outline-none py-1 group">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                )}
                <div className="flex items-center gap-1 text-slate-700 group-hover:text-slate-900 font-medium">
                  <span className="capitalize">
                    {userProfile?.first_name || "User"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
                </div>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent className="w-56 bg-white border border-slate-200 shadow-md rounded-sm p-1 font-sans" align="end">

                <DropdownMenuSeparator className="bg-slate-100" />

                {/* ====== MURNI COPAS LOGIKA SINKRONISASI ROLE DARI HEADER MARKETPLACE ====== */}
                {userProfile?.role === "admin" && (
                  <>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/panel")}>
                      <FileText className="w-4 h-4 mr-2 text-slate-400" /> Admin Panel 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/admin")}>
                      <Home className="w-4 h-4 mr-2 text-slate-400" /> Dashboard 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/profile")}>
                      <User className="w-4 h-4 mr-2 text-slate-400" /> Profile 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/wallet")}>
                      <CreditCard className="w-4 h-4 mr-2 text-slate-400" /> Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/messages")}>
                      <MessagesSquare className="w-4 h-4 mr-2 text-slate-400" /> Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/settings/edit-profile")}>
                      <Settings className="w-4 h-4 mr-2 text-slate-400" /> Profile Settings
                    </DropdownMenuItem>
                  </>
                )}

                {userProfile?.role === "vendor" && (
                  <>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/dashboard")}>
                      <Home className="w-4 h-4 mr-2 text-slate-400" /> Dashboard 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/profile")}>
                      <User className="w-4 h-4 mr-2 text-slate-400" /> Profile 
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/wallet")}>
                      <CreditCard className="w-4 h-4 mr-2 text-slate-400" /> Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/orders")}>
                      <ShoppingBasket className="w-4 h-4 mr-2 text-slate-400" /> Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/coupons")}>
                      <Tag className="w-4 h-4 mr-2 text-slate-400" /> My Coupons
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/messages")}>
                      <MessagesSquare className="w-4 h-4 mr-2 text-slate-400" /> Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 cursor-pointer rounded-xs text-xs" onClick={() => router.push("/settings/edit-profile")}>
                      <Settings className="w-4 h-4 mr-2 text-slate-400" /> Profile Settings
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700 font-medium cursor-pointer text-xs rounded-xs" onClick={handleDashboardLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </header>

        {/* Area Render Internal Halaman */}
        <main className="p-6 flex-1 max-w-[1400px] w-full mx-auto">
          {children}
        </main>

      </div>

    </div>
  );
}
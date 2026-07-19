import React from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ShoppingCart, Wallet, Package, Hourglass, MessageSquare, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import VendorCharts from "@/components/dashboard/VendorCharts";

async function getDashboardData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  // Secure Server Authentication Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Ambil Saldo Wallet Vendor
  const { data: wallet } = await supabase
    .from("user_wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  // 2. Hitung Total Produk & Pending Produk
  const { count: totalProducts } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: pendingProducts } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");

  // 3. Ambil Item Terjual Milik Vendor ini untuk agregasi chart & total sales
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("id, price, quantity, created_at, orders(status, payment_method)")
    .eq("vendor_id", user.id);

  let totalSalesCount = 0;
  let activeSalesCount = 0;
  let completedSalesCount = 0;
  
  // Array 12 Bulan untuk grafik tren bulanan
  const monthlyEarnings = Array(12).fill(0);

  if (orderItems) {
    orderItems.forEach((item: any) => {
      const qty = item.quantity || 0;
      totalSalesCount += qty;

      const orderStatus = item.orders?.status;
      if (orderStatus === "completed") {
        completedSalesCount += qty;
      } else if (orderStatus === "processing" || orderStatus === "shipping") {
        activeSalesCount += qty;
      }

      // Hitung pendapatan masuk per bulan untuk chart
      if (orderStatus !== "cancelled" && item.created_at) {
        const month = new Date(item.created_at).getMonth(); // 0 = Jan, 11 = Des
        monthlyEarnings[month] += Number(item.price || 0) * qty;
      }
    });
  }

  // 4. Ambil 5 Komentar Terbaru (Mock Join via product_comments jika ada tabelnya)
  const { data: comments } = await supabase
    .from("product_comments")
    .select("*, products(title)")
    .eq("products.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // 5. Ambil 5 Review Terbaru
  const { data: reviews } = await supabase
    .from("product_reviews")
    .select("*, products(title)")
    .eq("products.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // 6. Ambil 6 Transaksi Penjualan Barang Terbaru Vendor
  const { data: latestSales } = await supabase
    .from("order_items")
    .select("id, created_at, orders(invoice_number, status, payment_method)")
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  return {
    stats: {
      totalSales: totalSalesCount,
      balance: wallet?.balance || 0,
      products: totalProducts || 0,
      pendingProducts: pendingProducts || 0
    },
    charts: {
      activeSales: activeSalesCount,
      completedSales: completedSalesCount,
      monthlyEarnings
    },
    comments: comments || [],
    reviews: reviews || [],
    latestSales: latestSales || []
  };
}

export default async function VendorDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="w-full bg-[#f7f8f9] min-h-screen font-sans antialiased text-xs text-slate-600 p-6 space-y-6">
      
      {/* SEKSI 1: 4 KARTU HAMPARAN STATISTIK UTAMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Sales */}
        <div className="bg-white border border-gray-200/80 rounded-sm p-4 flex justify-between items-center shadow-3xs">
          <div className="space-y-1">
            <span className="text-xl font-extrabold text-slate-800">{data.stats.totalSales}</span>
            <p className="text-slate-400 font-medium text-[11px]">Number of total sales</p>
          </div>
          <ShoppingCart className="w-8 h-8 text-slate-300 stroke-[1.5]" />
        </div>

        {/* Card 2: Wallet Balance */}
        <div className="bg-white border border-gray-200/80 rounded-sm p-4 flex justify-between items-center shadow-3xs">
          <div className="space-y-1">
            <span className="text-xl font-extrabold text-slate-800">${Number(data.stats.balance).toFixed(2)}</span>
            <p className="text-slate-400 font-medium text-[11px]">Balance</p>
          </div>
          <Wallet className="w-8 h-8 text-slate-300 stroke-[1.5]" />
        </div>

        {/* Card 3: Total Products */}
        <div className="bg-white border border-gray-200/80 rounded-sm p-4 flex justify-between items-center shadow-3xs">
          <div className="space-y-1">
            <span className="text-xl font-extrabold text-slate-800">{data.stats.products}</span>
            <p className="text-slate-400 font-medium text-[11px]">Products</p>
          </div>
          <Package className="w-8 h-8 text-slate-300 stroke-[1.5]" />
        </div>

        {/* Card 4: Pending Products */}
        <div className="bg-white border border-gray-200/80 rounded-sm p-4 flex justify-between items-center shadow-3xs">
          <div className="space-y-1">
            <span className="text-xl font-extrabold text-slate-800">{data.stats.pendingProducts}</span>
            <p className="text-slate-400 font-medium text-[11px]">Pending Products</p>
          </div>
          <Hourglass className="w-8 h-8 text-slate-300 stroke-[1.5]" />
        </div>

      </div>

      {/* SEKSI 2: KONTEN GRAFIK ANALISIS (DI-RENDER OLEH VENDORCHARTS) */}
      <VendorCharts 
        activeSales={data.charts.activeSales} 
        completedSales={data.charts.completedSales} 
        monthlyEarnings={data.charts.monthlyEarnings} 
      />

      {/* SEKSI 3: RUANG TABEL FEEDBACK (KOMENTAR & REVIEW TERBARU) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Box Kiri: Latest Comments */}
        <div className="bg-white border border-gray-200/80 rounded-sm shadow-3xs flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-slate-400" /> Latest Comments
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[450px] text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 font-bold text-slate-600 h-9">
                  <th className="px-4 py-2">Id</th>
                  <th className="px-4 py-2">Comment</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-slate-600">
                {data.comments.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400 italic">No comments found!</td></tr>
                ) : (
                  data.comments.map((cm: any, idx) => (
                    <tr key={cm.id} className="h-12 hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-4 py-2 max-w-[150px] truncate">{cm.comment_text}</td>
                      <td className="px-4 py-2 text-[#00a896] max-w-[130px] truncate font-bold">{cm.products?.title}</td>
                      <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{new Date(cm.created_at).toLocaleDateString("id-ID")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50/60 border-t border-gray-100 flex justify-end">
            <Link href="/dashboard/comments" className="h-6 px-3 border border-gray-200 rounded-xs bg-white text-slate-600 flex items-center gap-1 font-bold hover:bg-slate-50 transition-colors text-[10px]">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Box Kanan: Latest Reviews */}
        <div className="bg-white border border-gray-200/80 rounded-sm shadow-3xs flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Star className="w-4 h-4 text-slate-400 fill-slate-100" /> Latest Reviews
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[450px] text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 font-bold text-slate-600 h-9">
                  <th className="px-4 py-2">Id</th>
                  <th className="px-4 py-2">Rating</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-slate-600">
                {data.reviews.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400 italic">No reviews found!</td></tr>
                ) : (
                  data.reviews.map((rv: any, idx) => (
                    <tr key={rv.id} className="h-12 hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3 align-top">
  {/* Baris Atas: Bintang Rating */}
  <div className="flex text-amber-400 gap-0.5 mb-1.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < (rv.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} 
      />
    ))}
  </div>
  
  {/* Baris Bawah: Teks Ulasan */}
  <p className="text-slate-600 break-words leading-relaxed font-medium">
    {rv.review_text}
  </p>
</td>
                      <td className="px-4 py-2 text-[#00a896] max-w-[150px] truncate font-bold">{rv.products?.title}</td>
                      <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{new Date(rv.created_at).toLocaleDateString("id-ID")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50/60 border-t border-gray-100 flex justify-end">
            <Link href="/dashboard/reviews" className="h-6 px-3 border border-gray-200 rounded-xs bg-white text-slate-600 flex items-center gap-1 font-bold hover:bg-slate-50 transition-colors text-[10px]">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>

      {/* SEKSI 4: TABEL TRANSAKSI PENJUALAN TERBARU (LATEST SALES) */}
      <div className="bg-white border border-gray-200/80 rounded-sm shadow-3xs overflow-hidden flex flex-col justify-between">
        <div className="p-4 border-b border-gray-100 font-bold text-slate-800 text-sm">
          Latest Sales
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[650px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 font-bold text-slate-600 h-9">
                <th className="px-4 py-2">Sale</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-center">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-slate-600">
              {data.latestSales.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 italic">No sales transactions logged yet.</td></tr>
              ) : (
                data.latestSales.map((item: any) => {
                  const order = item.orders;
                  const isWallet = order?.payment_method === "wallet";

                  return (
                    <tr key={item.id} className="h-12 hover:bg-slate-50/40 transition-colors">
                      <td className="px-4 py-2 font-bold text-slate-800">#{order?.invoice_number?.split("-")[1] || item.id.substring(0,6)}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-xs text-[9px] font-bold uppercase ${
                          order?.status === 'processing' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {order?.status || 'Processing'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-500 font-semibold">{isWallet ? "Wallet Balance" : "Pending Payment / Midtrans"}</td>
                      <td className="px-4 py-2 text-slate-400">{new Date(item.created_at).toLocaleString("id-ID", { hour12: false }).replace(/\//g, "-")}</td>
                      <td className="px-4 py-2 text-center">
                        <Link href={`/dashboard/sales/${order?.invoice_number}`} className="h-6 px-3 bg-[#00a896] hover:bg-[#009282] text-white rounded-xs font-bold inline-flex items-center text-[10px] transition-colors shadow-2xs">
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50/60 border-t border-gray-100 flex justify-end">
          <Link href="/dashboard/sales" className="h-6 px-3 border border-gray-200 rounded-xs bg-white text-slate-600 flex items-center gap-1 font-bold hover:bg-slate-50 transition-colors text-[10px]">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}
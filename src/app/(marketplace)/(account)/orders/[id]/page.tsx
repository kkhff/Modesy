"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Ban, ShoppingBag, FileText, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { createClient } from "@/lib/supabase/client";
import { cancelOrderAction } from "./action";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  
  const resolvedParams = React.use(params);
  const orderId = resolvedParams.id;

  // State Management
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadOrderDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: orderData } = await supabase
        .from("orders")
        .select(`
          id, invoice_number, buyer_id, total_amount, shipping_cost, payment_method, status, created_at, address_id,
          user_addresses (
            id, address_title, address_type, first_name, last_name, email, phone_number, address, country, state, city, zip_code
          )
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (!orderData) return setOrder(null);

      // 🌟 KITA TARIK JUGA KOLOM vat_rate DAN vat_price DARI TABLE order_items
      const { data: itemsData } = await supabase
        .from("order_items")
        .select(`
          *,
          products ( id, title, sku, image_urls ),
          vendor:profiles ( id, first_name, last_name, slug )
        `)
        .eq("order_id", orderId);

      setOrder(orderData);
      setItems(itemsData || []);
    } catch (err) {
      toast.error("An error occurred while loading order data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const handleCancelOrder = () => {
    if (!order) return;

    const isPaid = order.status === "processing";
    const alertText = isPaid 
      ? `Are you sure you want to cancel order #${order.invoice_number}? Since you have already paid, your funds ($${Number(order.total_amount).toFixed(2)}) will be automatically refunded to your Modesy Wallet.`
      : `Are you sure you want to cancel order #${order.invoice_number}? This order has not been paid yet.`;

    Swal.fire({
      title: "Cancel this order?",
      text: alertText,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Cancel It!",
      cancelButtonText: "No, Keep It",
      customClass: { popup: "rounded-sm text-xs font-sans" }
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      setIsCancelling(true);
      const loadToast = toast.loading("Processing order cancellation...");

      try {
        const res = await cancelOrderAction(order.id);
        toast.dismiss(loadToast);

        if (res.success) {
          toast.success(isPaid ? "Order cancelled and funds refunded!" : "Order cancelled successfully!");
          loadOrderDetails(); 
        } else {
          toast.error(res.error || "Failed to cancel order.");
        }
      } catch (err) {
        toast.dismiss(loadToast);
        toast.error("Unexpected error occurred.");
      } finally {
        setIsCancelling(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="w-full text-center py-24 font-sans text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#00a896]" /> Fetching order details repository...
      </div>
    );
  }

  if (!order) {
    return <div className="w-full text-center py-24 font-sans text-xs text-slate-400">Order repository record not found.</div>;
  }

  const address = (order as any).user_addresses;
  
  // 🌟 KALKULASI DINAMIS BERDASARKAN LOG DATA DI DATABASE PER ITEM
  const subtotal = items.reduce((acc, it) => acc + Number(it.total_price || 0), 0);
  const totalShipping = Number(order.shipping_cost || 0);
  const totalVatAmount = items.reduce((acc, it) => acc + Number(it.vat_price || 0), 0);
  const grandTotal = Number(order.total_amount);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 py-8 font-sans text-xs text-slate-600 antialiased space-y-6">
      
      {/* 1. BREADCRUMB & HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
            <Link href="/" className="hover:underline">Home</Link> / 
            <Link href="/orders" className="hover:underline">Orders</Link> / 
            <span className="text-slate-500 font-medium">Order</span>
          </div>
          <h1 className="text-lg font-bold text-slate-800">Order: #{order.invoice_number}</h1>
        </div>
        
        <div className="flex items-center gap-2 select-none">
          {(order.status === "pending" || order.status === "processing") ? (
            <button 
              type="button"
              disabled={isCancelling}
              onClick={handleCancelOrder}
              className="h-8 px-3 border border-gray-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              Cancel Order
            </button>
          ) : order.status === "completed" ? (
            <Link 
              href={`/invoice/${order.id}?type=buyer`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 border border-gray-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xs flex items-center gap-1.5 transition-colors shadow-3xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#00a896]" /> View Invoice
            </Link>
          ) : null}

          <Link href="/orders" className="h-8 px-4 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1.5 transition-colors shadow-3xs">
            <ShoppingBag className="w-3.5 h-3.5" /> Orders
          </Link>
        </div>
      </div>

      {/* 2. AREA DATA STATUS */}
      <div className="bg-white border border-gray-200/80 rounded-sm p-5 space-y-3.5 shadow-3xs max-w-2xl">
        <div className="grid grid-cols-[140px_1fr] gap-y-2.5 items-center font-medium">
          <div className="text-slate-400">Status</div>
          <div>
            <span className={`px-2 py-0.5 rounded-xs font-bold uppercase text-[9px] tracking-wide inline-block ${
              order.status === "completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
              order.status === "processing" ? "bg-blue-50 text-blue-600 border border-blue-100" :
              order.status === "cancelled" ? "bg-rose-50 text-rose-600 border border-rose-100" :
              "bg-amber-50 text-amber-600 border border-amber-100"
            }`}>
              {order.status}
            </span>
          </div>

          <div className="text-slate-400">Payment Method</div>
          <div className="font-bold text-slate-700 capitalize">{order.payment_method?.replace("_", " ")}</div>

          <div className="text-slate-400">Payment Status</div>
          <div className="font-semibold text-slate-700">
            {order.status === "pending" ? "Pending Payment" : order.status === "cancelled" ? "Cancelled" : "Paid"}
          </div>

          <div className="text-slate-400">Transaction Number</div>
          <div className="font-mono text-slate-800 font-semibold uppercase select-all">
            TRX-{order.id.slice(0, 8).toUpperCase()}
          </div>

          <div className="text-slate-400">Date</div>
          <div className="font-semibold text-slate-700">
            {new Date(order.created_at).toLocaleDateString("id-ID")} / {new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </div>

          <div className="text-slate-400">Updated</div>
          <div className="font-semibold text-slate-500">
            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* 3. GRID BLOK ALAMAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200/80 rounded-sm p-5 shadow-3xs space-y-3">
          <h2 className="text-xs font-bold text-slate-800 border-b border-gray-100 pb-2">Shipping Address</h2>
          {address ? (
            <div className="grid grid-cols-[120px_1fr] gap-y-2 font-medium">
              <div className="text-slate-400">First Name</div><div className="text-slate-700 font-bold">{address.first_name}</div>
              <div className="text-slate-400">Last Name</div><div className="text-slate-700 font-bold">{address.last_name || "-"}</div>
              <div className="text-slate-400">Email</div><div className="text-slate-700">{address.email}</div>
              <div className="text-slate-400">Phone Number</div><div className="text-slate-700">{address.phone_number}</div>
              <div className="text-slate-400">Address</div><div className="text-slate-700">{address.address}</div>
              <div className="text-slate-400">Country</div><div className="text-slate-700">{address.country}</div>
              <div className="text-slate-400">State</div><div className="text-slate-700">{address.state}</div>
              <div className="text-slate-400">City</div><div className="text-slate-700">{address.city}</div>
              <div className="text-slate-400">Zip Code</div><div className="text-slate-700 font-mono font-bold">{address.zip_code}</div>
            </div>
          ) : (
            <div className="text-slate-400 italic">No shipping address recorded.</div>
          )}
        </div>

        <div className="bg-white border border-gray-200/80 rounded-sm p-5 shadow-3xs space-y-3">
          <h2 className="text-xs font-bold text-slate-800 border-b border-gray-100 pb-2">Billing Address</h2>
          {address ? (
            <div className="grid grid-cols-[120px_1fr] gap-y-2 font-medium">
              <div className="text-slate-400">First Name</div><div className="text-slate-700 font-bold">{address.first_name}</div>
              <div className="text-slate-400">Last Name</div><div className="text-slate-700 font-bold">{address.last_name || "-"}</div>
              <div className="text-slate-400">Email</div><div className="text-slate-700">{address.email}</div>
              <div className="text-slate-400">Phone Number</div><div className="text-slate-700">{address.phone_number}</div>
              <div className="text-slate-400">Address</div><div className="text-slate-700">{address.address}</div>
              <div className="text-slate-400">Country</div><div className="text-slate-700">{address.country}</div>
              <div className="text-slate-400">State</div><div className="text-slate-700">{address.state}</div>
              <div className="text-slate-400">City</div><div className="text-slate-700">{address.city}</div>
              <div className="text-slate-400">Zip Code</div><div className="text-slate-700 font-mono font-bold">{address.zip_code}</div>
            </div>
          ) : (
            <div className="text-slate-400 italic">No billing address recorded.</div>
          )}
        </div>
      </div>

      {/* 4. SEKTOR DAFTAR PRODUK */}
      <div className="bg-white border border-gray-200/80 rounded-sm shadow-3xs p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-800 border-b border-gray-100 pb-2">Products</h2>
        
        <div className="hidden sm:grid sm:grid-cols-[1fr_120px_150px_120px] font-bold text-slate-400 border-b border-gray-100 pb-2 px-2">
          <div>Product</div>
          <div className="text-center">Total</div>
          <div className="text-center">Updated</div>
          <div className="text-right">Status</div>
        </div>

        <div className="divide-y divide-gray-100 w-full">
          {items.map((item: any) => {
            const vendorName = item.vendor ? `${item.vendor.first_name} ${item.vendor.last_name}` : "Vendor";
            const imgUrl = item.products?.image_urls && item.products.image_urls.length > 0 
              ? item.products.image_urls[0] 
              : "/placeholder-product.png";

            return (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:grid sm:grid-cols-[1fr_120px_150px_120px] items-start sm:items-center gap-4 font-medium px-2">
                
                <div className="flex gap-3 w-full">
                  <div className="w-14 h-16 relative border border-gray-100 bg-slate-50 rounded-xs overflow-hidden shrink-0">
                    <Image src={imgUrl} alt="Product Thumbnail" fill className="object-cover" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-slate-400">
                      Seller: <Link href={`/shop/${item.vendor?.slug}`} className="text-sky-600 hover:underline">{vendorName}</Link>
                    </div>
                    <span className="text-slate-800 font-bold block text-xs">
                      {item.products?.title || "Product Title Unavailable"}
                    </span>
                    <div className="text-slate-400 text-[11px] space-y-0.5">
                      <div>SKU: <span className="text-slate-600 font-semibold">{item.products?.sku || "N/A"}</span></div>
                      <div>Quantity: <span className="text-slate-600 font-semibold">{item.quantity}</span></div>
                      <div>Unit Price: <span className="text-slate-700 font-bold">${Number(item.price)}</span></div>
                      <div className="text-slate-400 text-[10px]">
                        VAT Total Log: <span className="text-slate-600 font-medium">({item.vat_rate || 0}%)</span> +${Number(item.vat_price || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kolom Total */}
                <div className="w-full sm:w-auto text-center sm:block flex justify-between items-center border-b sm:border-0 pb-1 sm:pb-0 border-slate-100">
                  <div className="text-slate-400 sm:hidden block font-bold text-[10px] uppercase">Total</div>
                  <div className="font-bold text-slate-800">${Number(item.total_price || 0).toFixed(2)}</div>
                </div>

                <div className="w-full sm:w-auto text-center sm:block flex justify-between items-center border-b sm:border-0 pb-1 sm:pb-0 border-slate-100">
                  <div className="text-slate-400 sm:hidden block font-bold text-[10px] uppercase">Updated</div>
                  <div className="text-slate-400 text-[11px] whitespace-nowrap">{formatDistanceToNow(new Date(item.created_at))} ago</div>
                </div>

                <div className="w-full sm:w-auto text-left sm:text-right sm:block flex justify-between items-center">
                  <div className="text-slate-400 sm:hidden block font-bold text-[10px] uppercase">Status</div>
                  <span className={`font-bold text-[11px] capitalize ${
                    order.status === "completed" ? "text-emerald-500" : 
                    order.status === "processing" ? "text-blue-500" :
                    order.status === "cancelled" ? "text-rose-500" :
                    "text-amber-500"
                  }`}>
                    {order.status === "pending" ? "Pending Payment" : order.status}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SUMMARY BOX COUNTER */}
      <div className="w-full flex flex-col items-end pt-2">
        <div className="w-full sm:w-80 bg-slate-50 border border-gray-200/60 p-4 rounded-sm space-y-2 text-slate-700 font-semibold shadow-3xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-bold text-slate-800">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="font-bold text-slate-800">${totalShipping.toFixed(2)}</span>
          </div>
          {/* 🌟 SEKARANG SUDAH DINAMIS MENAMPILKAN HASIL AKUMULASI DARI DATABASE */}
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>VAT Total</span>
            <span className="font-bold">${totalVatAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200/80 pt-2 text-slate-800 font-bold text-sm">
            <span>Total</span>
            <span className="text-[#00a896]">${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
import React from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import PrintButton from "./PrintButton"; // Kita bikin client component kecil di bawah khusus tombol print

async function getInvoiceData(orderId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ambil data order & user_addresses
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(`
      id, invoice_number, total_amount, shipping_cost, payment_method, status, created_at,
      user_addresses (
        first_name, last_name, email, phone_number, address, country, state, city, zip_code
      )
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) return null;

  // 🌟 SEKARANG KITA TARIK JUGA LOG DATA vat_rate DAN vat_price DARI DATABASE order_items
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(`
      *,
      products ( title, sku ),
      vendor:profiles ( first_name, last_name )
    `)
    .eq("order_id", orderId);

  if (itemsError || !items) return null;

  return { order, items };
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await getInvoiceData(resolvedParams.id);

  if (!data) notFound();

  const { order, items } = data;
  const address = (order as any).user_addresses;

  const subtotal = items.reduce((acc, it) => acc + Number(it.total_price || 0), 0);
  const shipping = Number(order.shipping_cost || 0);
  
  // Tinggal langsung dijumlahin aja tanpa perlu dikali it.quantity lagi
  const totalVatAmount = items.reduce((acc, it) => acc + Number(it.vat_price || 0), 0);
  
  const grandTotal = Number(order.total_amount);

  return (
    <div className="min-h-screen bg-[#f7f8f9] py-10 font-sans text-[11px] text-slate-700 antialiased print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: auto; margin: 0mm; }
          body { margin: 20mm; }
        }
      `}} />
      <div className="max-w-[800px] mx-auto bg-white border border-gray-200 p-8 shadow-sm space-y-8 print:border-0 print:shadow-none">
        
        {/* TOP TITLE */}
        <h1 className="text-xl text-center font-medium text-slate-800 tracking-wide uppercase border-b border-gray-100 pb-4">Invoice</h1>

        {/* HEADER BRAND & INVOICE INFO */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="text-4xl font-bold tracking-tight text-[#222] cursor-pointer shrink-0">
              M<span className="text-[#00a896]">o</span>desy
            </div>
            <p className="text-slate-500 leading-relaxed">
              3111 Camino Del Rio N Suite 400 San Diego<br />
              edward_test@domain.com<br />
              (541) 754-30103<br />
              Tax Registration Number: 27647643743
            </p>
          </div>
          <div className="text-right space-y-1 font-medium">
            <div className="grid grid-cols-[80px_1fr] text-left">
              <span className="font-bold text-slate-800">Invoice:</span>
              <span className="text-slate-600">#{order.invoice_number}</span>
            </div>
            <div className="grid grid-cols-[80px_1fr] text-left">
              <span className="font-bold text-slate-800">Date:</span>
              <span className="text-slate-600">
                {new Date(order.created_at).toISOString().split('T')[0]} / {new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>

        {/* CLIENT INFORMATION & PAYMENT DETAILS */}
        <div className="grid grid-cols-2 gap-8 border-t border-b border-gray-100 py-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 mb-1">Client Information</h3>
            {address ? (
              <p className="text-slate-600 leading-relaxed">
                {address.first_name} {address.last_name || ""}<br />
                {address.address}<br />
                {address.city}, {address.state}, {address.zip_code}<br />
                {address.country}<br />
                {address.phone_number}
              </p>
            ) : (
              <p className="italic text-slate-400">No address logged.</p>
            )}
          </div>
          <div className="space-y-1 font-medium">
            <h3 className="font-bold text-slate-800 mb-1">Payment Details</h3>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400">Payment Status:</span>
              <span className="text-slate-800 font-bold">{order.status === "completed" ? "Payment Received" : order.status === "processing" ? "Payment Received" : "Pending"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400">Payment Method:</span>
              <span className="text-slate-800 capitalize">{order.payment_method?.replace("_", " ")}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400">Currency:</span>
              <span className="text-slate-800 uppercase">USD</span>
            </div>
          </div>
        </div>

        {/* PRODUCTS TABLE */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 font-bold text-slate-800 h-8">
              <th className="py-1">Seller</th>
              <th className="py-1">Product Id</th>
              <th className="py-1">Description</th>
              <th className="py-1">Quantity</th>
              <th className="py-1">Unit Price</th>
              <th className="py-1">VAT</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
            {items.map((item: any) => (
              <tr key={item.id} className="h-10">
                <td className="py-2 font-bold text-slate-700">
                  {item.vendor ? `${item.vendor.first_name} ${item.vendor.last_name || ""}` : "Vendor"}
                </td>
                <td className="py-2 text-slate-500">{item.product_id}</td>
                <td className="py-2">
                  <div className="font-bold text-slate-800">{item.products?.title}</div>
                  <div className="text-[10px] text-slate-400">SKU: {item.products?.sku || "N/A"}</div>
                </td>
                <td className="py-2">{item.quantity}</td>
                {/* Unit Price (Original Price per item) */}
                <td className="py-2">${Number(item.price).toFixed(2)}</td>
                {/* VAT (Total nominal VAT dari total_price produk ini) */}
                <td className="py-2">${Number(item.vat_price || 0).toFixed(2)} ({item.vat_rate || 0}%)</td>
                {/* Total Price (Original Price * Quantity) */}
                <td className="py-2 text-right font-bold text-slate-800">
                  ${Number(item.total_price || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PRICING CALCULATION SUMMARY */}
        <div className="w-full flex flex-col items-end pt-4 border-t border-gray-100">
          <div className="w-64 space-y-1.5 font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800">${subtotal.toFixed(2)}</span>
            </div>
            {/* 🌟 DINAMIS: Akumulasi total nominal VAT gabungan seluruh barang */}
            <div className="flex justify-between">
              <span>VAT Total</span>
              <span className="font-bold text-slate-800">${totalVatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-bold text-slate-800">${shipping.toFixed(2)}</span>
            </div>

            <div className="flex justify-between border-t border-gray-200 pt-1.5 text-slate-800 font-bold text-xs">
              <span>Total</span>
              <span className="font-extrabold text-slate-900">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER ACTION BUTTON PRINT (Hilang otomatis saat kertas dicetak) */}
      <div className="w-full flex justify-center mt-6 print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Truck, CreditCard, ShoppingBag, CheckCircle2, ChevronRight, Loader2, CirclePlus, SquarePen, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { createClient } from "@/lib/supabase/client";

// Import Server Actions & Modal Alamat Bawaan Lu
import { getAddressesRoute, saveAddressRoute, deleteAddressRoute } from "../../(account)/settings/shipping-address/action";
import AddressModal from "@/components/modals/AddressModal";

interface CartItem {
  id: string;
  quantity: number;
  products: {
    id: string;
    title: string;
    price: number;
    discounted_price: number | null;
    discount_rate: number;
    image_urls: string[];
    country: string;
    state: string;
    city: string;
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

export default function CheckoutPage() {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  
  // CRUD & Modal State Alamat
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  // Selection Checkout State
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [useSameForBilling, setUseSameForBilling] = useState(true);
  const [selectedShippingMethods, setSelectedShippingMethods] = useState<Record<string, { name: string; cost: number }>>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("midtrans");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0); 

  const supabase = createClient();

  // 1. Ambil Data Alamat dari Supabase
  const fetchAddresses = async (selectNewest = false) => {
    const res = await getAddressesRoute();
    if (res.success && res.data) {
      setAddresses(res.data);
      if (res.data.length > 0) {
        if (selectNewest || !selectedAddressId) {
          setSelectedAddressId(res.data[0].id);
        }
      } else {
        setSelectedAddressId("");
      }
    }
  };

  // 2. Fetch Awal Data Paralel (Cart, Address, Wallet Balance Asli)
  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          toast.error("Please login to continue checkout.");
          return;
        }

        await fetchAddresses();

        // Ambil Data Keranjang Belanja
        const { data: cartData } = await supabase
          .from("carts")
          .select("id, quantity, products(*, profiles(first_name, last_name))")
          .eq("user_id", session.user.id);

        if (cartData) setCartItems(cartData as any);

        // Ambil Saldo Wallet Asli dari user_wallets Koneksi Profile Lu
        const { data: walletData } = await supabase
          .from("user_wallets")
          .select("balance")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (walletData) {
          setWalletBalance(Number(walletData.balance) || 0);
        }
      } catch (err) {
        console.error("Checkout data initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCheckoutData();
  }, []);

  // =========================================================================
  // MANAJEMEN CRUD ADDRESS IN-PLACE CHECKOUT
  // =========================================================================
  const handleSaveAddress = async (formData: any) => {
    setSavingAddress(true);
    const res = await saveAddressRoute(formData);
    setSavingAddress(false);

    if (res.success) {
      toast.success(formData.id ? "Address updated!" : "Address added successfully!");
      setIsModalOpen(false);
      await fetchAddresses(!formData.id);
    } else {
      toast.error(res.error || "Something went wrong");
    }
  };

  const handleEditAddressClick = (e: React.MouseEvent, address: any) => {
    e.stopPropagation();
    setSelectedAddress({
      id: address.id,
      addressType: address.address_type,
      addressTitle: address.address_title,
      firstName: address.first_name,
      lastName: address.last_name || "",
      email: address.email,
      phoneNumber: address.phone_number,
      country: address.country,
      state: address.state,
      city: address.city,
      zipCode: address.zip_code,
      address: address.address,
    });
    setIsModalOpen(true);
  };

  const handleDeleteAddressClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this address!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#00a896",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      customClass: { popup: "rounded-sm text-sm font-sans" }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const loadingToast = toast.loading("Deleting address...");
        const res = await deleteAddressRoute(id);
        toast.dismiss(loadingToast);

        if (res.success) {
          Swal.fire({
            title: "Deleted!",
            text: "Your address has been deleted.",
            icon: "success",
            confirmButtonColor: "#00a896",
            customClass: { popup: "rounded-sm text-sm font-sans" }
          });
          if (selectedAddressId === id) setSelectedAddressId("");
          await fetchAddresses();
        } else {
          toast.error(res.error || "Failed to delete");
        }
      }
    });
  };

  // =========================================================================
  // MULTI VENDOR GROUPING & KALKULATOR TARIF SHIPPNG BERJENJANG
  // =========================================================================
  const vendorGroups = useMemo(() => {
    const groups: Record<string, { vendorName: string; country: string; items: CartItem[] }> = {};
    cartItems.forEach((item) => {
      const p = item.products;
      const vendorName = `${p.profiles?.first_name || "Official"} ${p.profiles?.last_name || "Store"}`.trim();
      if (!groups[p.user_id]) {
        groups[p.user_id] = { vendorName, country: p.country || "", items: [] };
      }
      groups[p.user_id].items.push(item);
    });
    return groups;
  }, [cartItems]);

  const activeAddress = useMemo(() => {
    return addresses.find((a) => a.id === selectedAddressId);
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (!activeAddress || Object.keys(vendorGroups).length === 0) return;
    
    const defaults: Record<string, { name: string; cost: number }> = {};
    
    Object.entries(vendorGroups).forEach(([vendorId, vendor]) => {
      const buyerCountry = (activeAddress.country || "").toLowerCase().trim();
      const buyerState = (activeAddress.state || "").toLowerCase().trim();
      const buyerCity = (activeAddress.city || "").toLowerCase().trim();

      const vendorCountry = (vendor.country || "").toLowerCase().trim();
      const sampleProduct = vendor.items[0]?.products;
      const vendorState = (sampleProduct?.state || "").toLowerCase().trim();
      const vendorCity = (sampleProduct?.city || "").toLowerCase().trim();

      if (buyerCountry === vendorCountry) {
        let deliveryCost = 8.0; 
        let deliveryLabel = "Flat Rate (Inter-Provincial)";

        if (buyerCity === vendorCity) {
          deliveryCost = 2.0; 
          deliveryLabel = "Local Delivery (Same City)";
        } else if (buyerState === vendorState) {
          deliveryCost = 5.0; 
          deliveryLabel = "Regional Shipping";
        }
        defaults[vendorId] = { name: deliveryLabel, cost: deliveryCost };
      } else {
        defaults[vendorId] = { name: "Flat Rate (International Cargo)", cost: 20.0 };
      }
    });
    
    setSelectedShippingMethods(defaults);
  }, [activeAddress, vendorGroups]);

  const totals = useMemo(() => {
    let subtotal = 0;
    cartItems.forEach((item) => {
      const p = item.products;
      const finalPrice = p.discounted_price !== null ? Number(p.discounted_price) : Number(p.price);
      subtotal += finalPrice * item.quantity;
    });

    let shippingCost = 0;
    Object.values(selectedShippingMethods).forEach((ship) => {
      shippingCost += ship.cost;
    });

    return { subtotal, shippingCost, total: subtotal + shippingCost };
  }, [cartItems, selectedShippingMethods]);

  // =========================================================================
  // EKSEKUSI PLACE ORDER (INTEGRASI MIDTRANS SNAP / DEDUKSI USER WALLET)
  // =========================================================================
  const handlePlaceOrder = async () => {
    if (!agreeTerms) {
      toast.error("You must agree to the Terms and Conditions first.");
      return;
    }
    if (!selectedAddressId) {
      toast.error("Please select a shipping address first.");
      return;
    }

    // 🅰️ PILIHAN PEMBAYARAN: PLATFORM WALLET BALANCE
    if (selectedPaymentMethod === "wallet") {
      if (walletBalance < totals.total) {
        toast.error("Your wallet balance is insufficient.");
        return;
      }

      const loadingToast = toast.loading("Processing balance deduction...");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Session expired.");

        const newBalance = walletBalance - totals.total;
        const { error: walletError } = await supabase
          .from("user_wallets")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", session.user.id);

        if (walletError) throw walletError;

        setWalletBalance(newBalance);
        toast.dismiss(loadingToast);
        toast.success("Purchase successful! Paid using Wallet Balance.");
        setActiveStep(1);
      } catch (err: any) {
        toast.dismiss(loadingToast);
        toast.error("Failed to process wallet payment.");
      }
    } 
    
    // 🅱️ PILIHAN PEMBAYARAN: SECURE MIDTRANS SNAP POPUP (MENGGUNAKAN SDK)
    else if (selectedPaymentMethod === "midtrans") {
      const loadingToast = toast.loading("Connecting to Midtrans gateway...");

      try {
        const res = await fetch("/api/checkout/midtrans", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    amount: totals.total, // Total keseluruhan
    shippingCost: totals.shippingCost, // 👈 Kunci 1: HARUS ADA
    shippingMethods: selectedShippingMethods,
    addressId: selectedAddressId,
    items: cartItems.map(item => ({ // 👈 Kunci 2: HARUS ADA
      id: item.products.id,
      title: item.products.title,
      price: item.products.discounted_price !== null ? item.products.discounted_price : item.products.price,
      quantity: item.quantity,
      vendor_id: item.products.user_id // Tambahkan vendor_id agar aman buat order_items
    }))
  })
});
        const data = await res.json();
        toast.dismiss(loadingToast);

        if (!data.success) throw new Error(data.error || "Token generation error");

        if ((window as any).snap) {
          (window as any).snap.pay(data.token, {
            onSuccess: function (result: any) {
              toast.success("Payment completed successfully!");
            },
            onPending: function (result: any) {
              toast.custom(() => (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xs text-amber-800 text-xs font-medium shadow-sm">
                  Waiting for settlement. Please complete payment inside your app!
                </div>
              ));
            },
            onError: function () {
              toast.error("Payment transmission rejected!");
            }
          });
        } else {
          toast.error("Midtrans Snap SDK not loaded yet. Please refresh.");
        }
      } catch (err: any) {
        toast.dismiss(loadingToast);
        toast.error(err.message || "Failed to launch Midtrans.");
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full text-center py-20 font-sans text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#00a896]" /> Loading checkout forms...
      </div>
    );
  }

  return (
    <div className="max-w-[1250px] mx-auto px-4 py-8 font-sans text-xs text-slate-600 antialiased">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: ACCORDION BODY */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* STEP 1: SHIPPING INFORMATION */}
          <div className="bg-white border border-gray-200 rounded-xs shadow-3xs overflow-hidden">
            <div className="bg-slate-50/60 px-5 py-3.5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">1</span>
                Shipping Information
              </h2>
              {activeStep > 1 && (
                <button type="button" onClick={() => setActiveStep(1)} className="text-[#00a896] font-bold hover:underline cursor-pointer">Edit</button>
              )}
            </div>

            {activeStep === 1 && (
              <div className="p-5 space-y-6 animate-fade-in">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Shipping Address</span>
                    <button type="button" onClick={() => { setSelectedAddress(null); setIsModalOpen(true); }} className="text-[#00a896] font-bold hover:text-[#009282] flex items-center gap-1 cursor-pointer">
                      <CirclePlus className="w-3.5 h-3.5" /> Add New Address
                    </button>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="border border-dashed border-gray-200 rounded-xs p-6 text-center text-slate-400 italic bg-slate-50/40">
                      You have not added a shipping address yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {addresses.map((addr) => (
                        <label key={addr.id} className={`border rounded-xs p-4 flex items-start gap-3 cursor-pointer transition-all relative group/card ${selectedAddressId === addr.id ? "border-[#00a896] bg-teal-50/5" : "border-gray-200 bg-white"}`}>
                          <input type="radio" name="checkout_addr" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-0.5 accent-[#00a896]" />
                          <div className="flex-1 min-w-0 pr-10">
                            <span className="text-[9px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-xs inline-block mb-1">{addr.address_type}</span>
                            <p className="font-bold text-slate-800 capitalize truncate">{addr.address_title}</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{addr.first_name} {addr.last_name}</p>
                            <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">{addr.address}, {addr.city}, {addr.state}, {addr.country}</p>
                          </div>
                          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/90 pl-2">
                            <button type="button" onClick={(e) => handleEditAddressClick(e, addr)} className="text-slate-400 hover:text-[#00a896] cursor-pointer"><SquarePen className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={(e) => handleDeleteAddressClick(e, addr.id)} className="text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dinamika Penentuan Kurir Split Toko */}
                {selectedAddressId && Object.keys(vendorGroups).length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <span className="font-bold text-slate-700 block">Shipping Method</span>
                    {Object.entries(vendorGroups).map(([vendorId, vendor]) => {
                      const isDomestik = activeAddress?.country?.toLowerCase().trim() === vendor.country?.toLowerCase().trim();
                      const currentMethod = selectedShippingMethods[vendorId]?.name;

                      return (
                        <div key={vendorId} className="border border-slate-100 bg-slate-50/30 rounded-xs p-4 space-y-3">
                          <div className="flex items-center gap-2 font-bold text-slate-800"><Truck className="w-4 h-4 text-slate-400" /> <span>{vendor.vendorName}</span></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {isDomestik ? (
                              <>
                                <label className={`border rounded-xs p-3 flex items-center justify-between bg-white cursor-pointer ${currentMethod === "Local Pickup" ? "border-[#00a896]" : "border-gray-200"}`}>
                                  <div className="flex items-center gap-2">
                                    <input type="radio" name={`ship_${vendorId}`} checked={currentMethod === "Local Pickup"} onChange={() => setSelectedShippingMethods(prev => ({ ...prev, [vendorId]: { name: "Local Pickup", cost: 0 } }))} className="accent-[#00a896]" />
                                    <div><p className="font-bold text-slate-800">Local Pickup</p><p className="text-slate-400 text-[10px]">Pick up directly from store</p></div>
                                  </div>
                                  <span className="font-bold text-slate-700">$0.00</span>
                                </label>

                                {(() => {
                                  const buyerCity = (activeAddress?.city || "").toLowerCase().trim();
                                  const sampleProduct = vendor.items[0]?.products;
                                  const vendorCity = (sampleProduct?.city || "").toLowerCase().trim();
                                  const buyerState = (activeAddress?.state || "").toLowerCase().trim();
                                  const vendorState = (sampleProduct?.state || "").toLowerCase().trim();
                                  
                                  let calculatedCost = 8.0;
                                  let calculatedLabel = "Flat Rate (Inter-Provincial)";
                                  
                                  if (buyerCity === vendorCity) { calculatedCost = 2.0; calculatedLabel = "Local Delivery (Same City)"; }
                                  else if (buyerState === vendorState) { calculatedCost = 5.0; calculatedLabel = "Regional Shipping"; }

                                  const isDeliverySelected = currentMethod !== "Local Pickup";

                                  return (
                                    <label className={`border rounded-xs p-3 flex items-center justify-between bg-white cursor-pointer ${isDeliverySelected ? "border-[#00a896]" : "border-gray-200"}`}>
                                      <div className="flex items-center gap-2">
                                        <input type="radio" name={`ship_${vendorId}`} checked={isDeliverySelected} onChange={() => setSelectedShippingMethods(prev => ({ ...prev, [vendorId]: { name: calculatedLabel, cost: calculatedCost } }))} className="accent-[#00a896]" />
                                        <div><p className="font-bold text-slate-800">{calculatedLabel}</p><p className="text-slate-400 text-[10px]">Delivery to your home</p></div>
                                      </div>
                                      <span className="font-bold text-slate-700">${calculatedCost.toFixed(2)}</span>
                                    </label>
                                  );
                                })()}
                              </>
                            ) : (
                              <label className="border border-[#00a896] rounded-xs p-3 flex items-center justify-between bg-white col-span-2">
                                <div className="flex items-center gap-2">
                                  <input type="radio" defaultChecked={true} className="accent-[#00a896]" />
                                  <div><p className="font-bold text-slate-800">Flat Rate (International Cargo)</p><p className="text-slate-400 text-[10px]">Cross-border shipment</p></div>
                                </div>
                                <span className="font-bold text-slate-700">$20.00</span>
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => selectedAddressId && setActiveStep(2)} 
                    className="h-10 px-6 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1 cursor-pointer"
                  >
                    Continue to Payment Method <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: PAYMENT METHOD CHOICE */}
          <div className="bg-white border border-gray-200 rounded-xs shadow-3xs overflow-hidden">
            <div className="bg-slate-50/60 px-5 py-3.5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">2</span>
                Payment Method
              </h2>
              {activeStep > 2 && <button type="button" onClick={() => setActiveStep(2)} className="text-[#00a896] font-bold hover:underline cursor-pointer">Edit</button>}
            </div>

            {activeStep === 2 && (
              <div className="p-5 space-y-5 animate-fade-in">
                <div className="space-y-2">
                  <label className={`border rounded-xs p-3.5 flex items-center justify-between bg-white cursor-pointer ${selectedPaymentMethod === "midtrans" ? "border-[#00a896] bg-teal-50/5" : "border-gray-200"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="pm" checked={selectedPaymentMethod === "midtrans"} onChange={() => setSelectedPaymentMethod("midtrans")} className="accent-[#00a896]" />
                      <div><span className="font-bold text-slate-800">Midtrans Gateway</span><p className="text-slate-400 text-[10px]">Virtual Account, QRIS, Credit Card</p></div>
                    </div>
                  </label>

                  <label className={`border rounded-xs p-3.5 flex items-center justify-between bg-white cursor-pointer ${selectedPaymentMethod === "wallet" ? "border-[#00a896] bg-teal-50/5" : "border-gray-200"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="pm" checked={selectedPaymentMethod === "wallet"} onChange={() => setSelectedPaymentMethod("wallet")} className="accent-[#00a896]" />
                      <div><span className="font-bold text-slate-800">Wallet Balance</span><p className="text-slate-400 text-[10px]">Instant platform balance payment</p></div>
                    </div>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-xs">Wallet: ${walletBalance.toFixed(2)}</span>
                  </label>
                </div>

                <label className="flex items-start gap-2 text-slate-500 font-medium cursor-pointer py-2 select-none">
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5 accent-[#00a896]" />
                  <span>I agree to <Link href="/terms" className="text-[#00a896] font-bold">Terms & Conditions</Link></span>
                </label>

                <div className="flex justify-end pt-2">
                  <button type="button" onClick={() => setActiveStep(3)} className="h-10 px-6 bg-[#00a896] hover:bg-[#009282] text-white font-bold rounded-xs flex items-center gap-1 cursor-pointer">
                    Continue to Payment <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: PAYMENT SUBMIT SECTION */}
          <div className="bg-white border border-gray-200 rounded-xs shadow-3xs overflow-hidden">
            <div className="bg-slate-50/60 px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">3</span>
                Payment
              </h2>
            </div>

            {activeStep === 3 && (
              <div className="p-10 text-center space-y-4 max-w-md mx-auto">
                <CreditCard className="w-12 h-12 text-[#00a896] mx-auto opacity-80" />
                <h3 className="text-sm font-bold text-slate-800 capitalize">{selectedPaymentMethod} Order</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {selectedPaymentMethod === "wallet" ? "Deducted instantly from your account wallet balance." : "You will be redirected via secure encrypted Midtrans gateway window."}
                </p>
                <button type="button" onClick={handlePlaceOrder} className="w-full h-10 bg-[#00a896] hover:bg-[#009282] text-white font-bold uppercase rounded-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
                  <CheckCircle2 className="w-4 h-4" /> Place Order
                </button>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: SUMMARY PANEL */}
        <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xs p-5 shadow-3xs space-y-5">
          <h2 className="text-sm font-bold text-slate-800 border-b border-gray-100 pb-3 flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-slate-400" /> Order Summary ({cartItems.length})</h2>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {cartItems.map((item) => {
              const p = item.products;
              const finalPrice = p.discounted_price !== null ? Number(p.discounted_price) : Number(p.price);
              return (
                <div key={item.id} className="flex gap-3 items-start border-b border-gray-50 pb-3 last:border-0">
                  <div className="w-12 h-14 bg-slate-50 border border-gray-100 rounded-xs overflow-hidden shrink-0"><img src={p.image_urls?.[0]} alt={p.title} className="w-full h-full object-cover" /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 truncate">{p.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Seller: <span className="text-[#00a896] font-semibold">{`${p.profiles?.first_name} ${p.profiles?.last_name || ""}`}</span></p>
                    <div className="flex justify-between items-center pt-1 text-[11px]"><span className="text-slate-400">Qty: <strong>{item.quantity}</strong></span><span className="font-bold text-slate-800">${(finalPrice * item.quantity).toFixed(2)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2.5 font-medium text-slate-700">
            <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="font-bold">${totals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Shipping</span><span className="font-bold text-emerald-600">${totals.shippingCost.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-3 text-slate-900"><span>Total</span><span className="text-[#00a896] text-base font-extrabold">${totals.total.toFixed(2)}</span></div>
          </div>
        </div>

      </div>

      <AddressModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveAddress} saving={savingAddress} editData={selectedAddress} />
    </div>
  );
}
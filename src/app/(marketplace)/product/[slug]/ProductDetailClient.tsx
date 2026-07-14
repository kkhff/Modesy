"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Star, Heart, MessageSquare, Eye, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";
import ReportProductModal from "@/components/modals/ReportProductModal";
import AddReviewModal from "@/components/modals/AddReviewModal"; // Import modal review baru
import AddToCartSuccessModal from "@/components/modals/AddToCartSuccessModal"; // Import modal ringkasan keranjang baru
import AskQuestionModal from "@/components/modals/AskQuestionModal";

const socialIcons = [
  { 
    name: "facebook", 
    shareUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    path: "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" 
  },
  { 
    name: "twitter", 
    shareUrl: (url: string, title: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" 
  },
  { 
    name: "whatsapp", 
    shareUrl: (url: string, title: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + url)}`,
    path: "M12.004 2C6.48 2 2 6.48 2 12.004c0 1.708.43 3.38 1.25 4.86L2 22l5.304-1.392c1.432.784 3.052 1.2 4.7 1.2 5.524 0 10.004-4.476 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm6.276 14.18c-.26.732-1.508 1.34-2.084 1.416-.564.076-1.132.104-3.64-.912-3.212-1.304-5.228-4.576-5.388-4.792-.16-.216-1.284-1.716-1.284-3.276 0-1.556.796-2.32 1.08-2.616.284-.296.62-.372.828-.372.208 0 .416.004.6.012.192.008.448-.072.7.544.26.632.888 2.17.964 2.324.076.156.128.336.024.544-.104.212-.156.344-.312.524-.156.18-.328.404-.468.54-.156.152-.32.316-.136.632.184.312.82 1.348 1.756 2.184.936.832 1.724 1.092 2.04 1.248.316.156.504.132.688-.08.184-.212.8-.932 1.016-1.252.216-.32.432-.268.728-.156.296.116 1.884.888 2.204 1.048.32.16.532.24.608.372.08.132.08.764-.18 1.496z" 
  }
];

export default function ProductDetailClient({ product, currentUserProfile }: { product: any; currentUserProfile?: any }) {
  const price = Number(product.price) || 0;
  const discountedPrice = product.discounted_price !== null ? Number(product.discounted_price) : null;
  const hasDiscount = product.discount_rate > 0 || (discountedPrice !== null && discountedPrice < price);
  const finalPrice = hasDiscount && discountedPrice !== null ? discountedPrice : price;
  
  const [shippingCountries, setShippingCountries] = useState<any[]>([]);
  const [shippingStates, setShippingStates] = useState<any[]>([]);
  const [selectedShipCountry, setSelectedShipCountry] = useState(currentUserProfile?.country || "");
  const [selectedShipState, setSelectedShipState] = useState(currentUserProfile?.state_or_province || "");
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("desc");
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCartSuccessModalOpen, setIsCartSuccessModalOpen] = useState(false);
  const [lastAddedQty, setLastAddedQty] = useState(0);

// Cari tahu apakah user saat ini sudah pernah mengulas produk ini sebelumnya
const userExistingReview = useMemo(() => {
  if (!currentUserProfile?.id || !Array.isArray(product.product_reviews)) return null;
  return product.product_reviews.find((r: any) => r.user_id === currentUserProfile.id) || null;
}, [product.product_reviews, currentUserProfile?.id]);

  // --- 🌟 STATE KONTROL WISHLIST LIVE DI CLIENT ---
  const [isWished, setIsWished] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(Number(product.wishlists?.[0]?.count) || 0);

  // Cek apakah akun yang sedang login saat ini sudah menandai wishlist pada produk ini
  useEffect(() => {
    if (!currentUserProfile?.id || !product?.id) return;

    const checkWishlistStatus = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", currentUserProfile.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (data) setIsWished(true);
    };

    checkWishlistStatus();
  }, [currentUserProfile?.id, product?.id]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) {
      toast.error("Please provide a short description of the issue.");
      return;
    }
    if (!currentUserProfile?.id) {
      toast.error("You must log in to report this product!");
      return;
    }

    setIsSubmittingReport(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase
        .from("product_reports")
        .insert({
          product_id: product.id,
          user_id: currentUserProfile.id,
          description: reportDescription.trim()
        });

      if (error) throw error;

      toast.success("Product has been reported successfully.");
      setReportDescription("");
      setIsReportModalOpen(false); // Tutup modal setelah sukses
    } catch (err) {
      console.error("Failed to submit report:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // --- 🌟 ACTION HANDLER: TOGGLE WISHLIST SYSTEM ---
  const handleToggleWishlist = async () => {
    if (!currentUserProfile?.id) {
      toast.error("You must log in to add items to your wishlist!");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (isWished) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", currentUserProfile.id)
          .eq("product_id", product.id);

        if (error) throw error;
        setIsWished(false);
        setWishlistCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert({ user_id: currentUserProfile.id, product_id: product.id });

        if (error) throw error;
        setIsWished(true);
        setWishlistCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Wishlist operation failed:", err);
      toast.error("Failed to update wishlist.");
    }
  };

  // --- 🌟 ACTION HANDLER: ADD TO CART WITH MATRICES VARIATIONS ---
  const handleAddToCart = async () => {
    if (!currentUserProfile?.id) {
      toast.error("You must log in to add items to the cart!");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // Ekstrak nama kombinasi opsi terpilih saat ini di halaman UI pembeli
      const currentSelectedVariantName = Object.values(selectedOptions).join(", ");
      const matchingVariant = Array.isArray(product.variations)
        ? product.variations.find(
            (v: any) => v.name.toLowerCase() === currentSelectedVariantName.toLowerCase()
          )
        : null;

      const { error } = await supabase
        .from("carts")
        .insert({
          user_id: currentUserProfile.id,
          product_id: product.id,
          variation_id: matchingVariant ? matchingVariant.id : null,
          quantity: quantity
        });

      if (error) throw error;

      setLastAddedQty(quantity);
      setIsCartSuccessModalOpen(true);
      toast.success("Product successfully added to your cart!");
    } catch (err) {
      console.error("Cart insertion failed:", err);
      toast.error("Failed to add product to cart.");
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !product?.id) return;
    if (!currentUserProfile?.id) {
      toast.error("You must log in first to leave a comment!");
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data: newComment, error } = await supabase
        .from("product_comments")
        .insert({
          product_id: product.id,
          user_id: currentUserProfile.id,
          parent_id: replyToId,
          comment_text: commentText.trim(),
        })
        .select("*, profiles(first_name, last_name)")
        .single();

      if (error) throw error;

      if (product.product_comments) {
        product.product_comments = [...product.product_comments, newComment];
      } else {
        product.product_comments = [newComment];
      }

      setCommentText("");
      setReplyToId(null);
      toast.success("Comment posted successfully!");
    } catch (err) {
      console.error("Failed to send comment:", err);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateAffiliateLink = async () => {
    if (!currentUserProfile?.id) {
      toast.error("You must log in first to create an affiliate link!");
      return;
    }
    if (!product.is_affiliate) {
      toast.error("This product is not enrolled in the affiliate program.");
      return;
    }
    if (currentUserProfile.id === product.user_id) {
      toast.error("You cannot create an affiliate link for your own product!"); 
      return;
    }

    setIsGeneratingRef(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data: existingLink, error: fetchError } = await supabase
        .from("product_affiliates")
        .select("affiliate_code")
        .eq("user_id", currentUserProfile.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let finalCode = existingLink?.affiliate_code;

      if (!finalCode) {
        const uniqueString = Math.random().toString(36).substring(2, 7);
        const cleanName = (currentUserProfile.first_name || "user").toLowerCase().replace(/[^a-z0-9]/g, "");
        const generatedCode = `ref-${cleanName}-${uniqueString}`;

        const { data: newLink, error: insertError } = await supabase
          .from("product_affiliates")
          .insert({
            user_id: currentUserProfile.id,
            product_id: product.id,
            affiliate_code: generatedCode,
            status: true
          })
          .select("affiliate_code")
          .single();

        if (insertError) throw insertError;
        finalCode = newLink.affiliate_code;
      }

      const cleanUrl = currentUrl.split("?")[0];
      const fullAffiliateUrl = `${cleanUrl}?ref=${finalCode}`;
      
      await navigator.clipboard.writeText(fullAffiliateUrl);
      toast.success("Affiliate link copied to clipboard!");

    } catch (err) {
      console.error("Failed to process affiliate link:", err);
      toast.error("An error occurred while creating your affiliate link.");
    } finally {
      setIsGeneratingRef(false);
    }
  };

  const handleDeleteComment = async (commentId: bigint) => {
    const dynamicConfirm = window.confirm("Are you sure you want to delete this comment?");
    if (!dynamicConfirm) return;

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase
        .from("product_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      product.product_comments = product.product_comments.filter((c: any) => c.id !== commentId);
      toast.success("Comment deleted successfully.");
      setActiveTab("comments"); 
    } catch (err) {
      console.error("Failed to delete comment:", err);
      toast.error("Failed to delete comment. Please try again.");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const hasIncremented = useRef(false); 

  useEffect(() => {
    if (!product?.id || hasIncremented.current) return;

    const incrementPageViews = async () => {
      try {
        hasIncremented.current = true;
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.rpc("increment_page_views", { row_id: product.id });
      } catch (err) {
        console.error("Failed to increment page_views:", err);
        hasIncremented.current = false;
      }
    };

    incrementPageViews();
  }, [product?.id]);

  useEffect(() => {
    if (activeTab !== "shipping") return;

    const fetchCountriesForShipping = async () => {
      try {
        const res = await fetch("https://api.countrystatecity.in/v1/countries", {
          headers: { "X-CSCAPI-KEY": process.env.NEXT_PUBLIC_CSC_API_KEY! }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setShippingCountries(data);
        }
      } catch (err) {
        console.error("Failed to load cargo countries:", err);
      }
    };
    fetchCountriesForShipping();
  }, [activeTab]);

  useEffect(() => {
    if (!selectedShipCountry || activeTab !== "shipping") return;

    const fetchStatesForShipping = async () => {
      try {
        const targetCountryObj = shippingCountries.find(c => c.name === selectedShipCountry);
        const countryIso = targetCountryObj?.iso2 || selectedShipCountry;

        const res = await fetch(`https://api.countrystatecity.in/v1/countries/${countryIso}/states`, {
          headers: { "X-CSCAPI-KEY": process.env.NEXT_PUBLIC_CSC_API_KEY! }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setShippingStates(data);
        }
      } catch (err) {
        console.error("Failed to load cargo states:", err);
      }
    };
    fetchStatesForShipping();
  }, [selectedShipCountry, shippingCountries, activeTab]);

  const calculatedShippingCost = useMemo(() => {
    const pCountry = product.country?.toLowerCase().trim() || "";
    const pState = product.state?.toLowerCase().trim() || "";

    const targetCountry = selectedShipCountry?.toLowerCase().trim();
    const targetState = selectedShipState?.toLowerCase().trim();

    if (!targetCountry) return "Select location first";

    if (pCountry !== targetCountry) {
      return "$25.00 (International Cargo Rate)";
    } else if (pState !== targetState && targetState !== "") {
      return "$8.00 (Inter-Provincial Flat Rate)";
    } else {
      return "$3.00 (Local Regional Flat Rate)";
    }
  }, [product, selectedShipCountry, selectedShipState]);

  const allImages = product.image_urls && product.image_urls.length > 0 ? product.image_urls : ["https://placehold.co/400x500"];
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const sellerFullName = useMemo(() => {
    if (product.profiles) {
      const first = product.profiles.first_name || "";
      const last = product.profiles.last_name || "";
      return `${first} ${last}`.trim() || "Official Store";
    }
    return "Official Store";
  }, [product.profiles]);

  const blueprintOptions = useMemo(() => {
    return Array.isArray(product.variation_options) ? product.variation_options : [];
  }, [product.variation_options]);

  const extractedOptions = useMemo(() => {
    return blueprintOptions.map((opt: any, index: number) => {
      const uniqueValues = new Set<string>();
      const valueDetails: any[] = [];

      if (Array.isArray(product.variations)) {
        product.variations.forEach((v: any) => {
          if (!v.name) return;
          const splitNames = v.name.split(",").map((s: string) => s.trim());
          const targetValue = splitNames[index];

          if (targetValue && !uniqueValues.has(targetValue)) {
            uniqueValues.add(targetValue);
            valueDetails.push({
              name: targetValue,
              variantImage: v.variant_image_url || null,
            });
          }
        });
      }

      return {
        name: opt.name,
        type: opt.type,
        values: valueDetails,
      };
    });
  }, [blueprintOptions, product.variations]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    extractedOptions.forEach((opt: any) => {
      if (opt.values.length > 0) initial[opt.name] = opt.values[0].name;
    });
    return initial;
  });

  const handleSelectOption = (optName: string, valName: string) => {
    setSelectedOptions((prev) => {
      const updated = { ...prev, [optName]: valName };
      const matchingExtract = extractedOptions.find((o: any) => o.name === optName);
      const matchingVal = matchingExtract?.values.find((v: any) => v.name === valName);
      
      if (matchingVal?.variantImage) {
        const foundIndex = allImages.findIndex((img: string) => img === matchingVal.variantImage);
        if (foundIndex !== -1) {
          setActiveImgIndex(foundIndex);
        }
      }
      return updated;
    });
  };

  const deliveryEstimation = useMemo(() => {
    const baseDaysStr = product.delivery_time || "2-3"; 
    const daysArr = baseDaysStr.split("-").map(Number);
    let minDays = daysArr[0] || 2;
    let maxDays = daysArr[1] || minDays + 2;

    const pCountry = product.country?.toLowerCase().trim() || "";
    const pState = product.state?.toLowerCase().trim() || "";
    const pCity = product.city?.toLowerCase().trim() || "";

    const uCountry = currentUserProfile?.country?.toLowerCase().trim() || pCountry; 
    const uState = currentUserProfile?.state_or_province?.toLowerCase().trim() || "";
    const uCity = currentUserProfile?.city?.toLowerCase().trim() || "";

    if (pCountry !== uCountry) {
      minDays += 7;
      maxDays += 14;
    } else if (pState !== uState && uState !== "") {
      minDays += 2;
      maxDays += 4;
    } else if (pCity !== uCity && uCity !== "") {
      minDays += 1;
      maxDays += 2;
    }

    return {
      daysRange: `${minDays}-${maxDays} Days`,
      location: currentUserProfile?.city ? `${currentUserProfile.city}, ${currentUserProfile.country}` : `${product.city || "East Java"}, ${product.country || "Indonesia"}`
    };
  }, [product, currentUserProfile]);

  // ✅ YANG BARU (Kalkulasi rata-rata bintang secara dinamis dari array review):
const totalReviews = Array.isArray(product.product_reviews) ? product.product_reviews.length : 0;

const averageRating = useMemo(() => {
  if (totalReviews === 0) return 0;
  const totalScore = product.product_reviews.reduce((sum: number, rev: any) => sum + (Number(rev.rating) || 0), 0);
  return totalScore / totalReviews;
}, [product.product_reviews, totalReviews]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 font-sans text-sm text-slate-700 bg-white border border-gray-200 rounded-xs my-6">
      
      {/* BREADCRUMB */}
      <div className="text-xs text-slate-400 mb-6 flex flex-wrap gap-1.5 items-center font-medium">
        <span>Home</span> / <span>Products</span> / <span className="text-slate-600 font-semibold">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* SLIDER IMAGES */}
        <div className="md:col-span-6 flex flex-col sm:flex-row gap-4">
          <div className="flex sm:flex-col gap-2 order-2 sm:order-1 overflow-x-auto sm:overflow-x-visible">
            {allImages.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setActiveImgIndex(idx)}
                className={`w-14 h-[72px] rounded-xs border overflow-hidden shrink-0 transition-all ${
                  activeImgIndex === idx ? "border-[#00a896] ring-1 ring-[#00a896]" : "border-gray-200"
                }`}
              >
                <img src={img} alt="Thumb" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          <div className="flex-1 aspect-[4/5] border border-gray-100 bg-gray-50 rounded-xs relative group order-1 sm:order-2 overflow-hidden">
            <img src={allImages[activeImgIndex]} alt={product.title} className="w-full h-full object-cover" />
            <button 
              onClick={() => setActiveImgIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-[#00a896] hover:text-white shadow-xs transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveImgIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-[#00a896] hover:text-white shadow-xs transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* INFO PRODUK */}
        <div className="md:col-span-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">{product.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2 font-medium">
              <div>Seller: <span className="text-[#00a896] font-bold hover:underline cursor-pointer">{sellerFullName}</span></div>
              <div className="flex items-center gap-0.5 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(averageRating) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`} />
                ))}
                <span className="text-slate-400 text-[11px] ml-1">Reviews ({totalReviews})</span>
              <button 
  onClick={() => {
    setActiveTab("comments");
    // Scroll smooth ke area panel tabs detail biar gak bingung
    document.getElementById("product-tabs-section")?.scrollIntoView({ behavior: "smooth" });
  }}
  className="flex items-center gap-1 hover:text-[#00a896] transition-colors cursor-pointer text-slate-500 font-medium"
>
  <MessageSquare className="w-3.5 h-3.5 text-gray-400" /> 
  <span>{product.product_comments ? product.product_comments.length : 0} comments</span>
</button>
              </div>
              <div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-gray-400" /> {product.page_views || 0} views</div>
              
              {/* 🌟 ACTION INTERFASE COUNTER & TOGGLE WISHLIST LIVE */}
              <button onClick={handleToggleWishlist} className="flex items-center gap-1 hover:text-rose-500 transition-colors cursor-pointer text-slate-500 font-medium">
                <Heart className={`w-3.5 h-3.5 transition-all ${isWished ? "fill-rose-500 text-rose-500 scale-105" : "text-gray-400"}`} /> 
                <span>{wishlistCount} wishlists</span>
              </button>
            </div>
          </div>
          <button
  type="button"
  onClick={() => {
    if (!currentUserProfile?.id) {
      toast.error("You must log in first to ask a question!");
      return;
    }
    setIsAskModalOpen(true);
  }}
  className="h-9 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-xs rounded-xs flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer"
>
  <MessageSquare className="w-3.5 h-3.5 text-gray-400" /> Ask Question
</button>

          <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
            <span className="text-3xl font-extrabold text-[#00a896]">${finalPrice.toFixed(2)}</span>
            {hasDiscount && (
              <>
                <span className="text-base text-gray-400 line-through font-medium">${price.toFixed(2)}</span>
                <span className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-xs shadow-xs">
                  -{product.discount_rate}%
                </span>
              </>
            )}
          </div>

          <div className="space-y-2 text-xs font-medium border-b border-gray-100 pb-4">
            <div className="flex">
              <span className="w-16 text-slate-400">Status</span>
              <span className={product.stock > 0 ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            <div className="flex">
              <span className="w-16 text-slate-400">SKU</span>
              <span className="font-mono text-slate-700 font-semibold">{product.sku || "N/A"}</span>
            </div>
          </div>

          {/* DYNAMIC VARIATION RENDERING */}
          <div className="space-y-5 border-b border-gray-100 pb-5">
            {extractedOptions.map((opt: any) => {
              if (opt.values.length === 0) return null;
              return (
                <div key={opt.name} className="space-y-2">
                  <span className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
                    {opt.name}: <span className="font-semibold text-gray-500 normal-case">{selectedOptions[opt.name]}</span>
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {opt.values.map((val: any) => {
                      const isSelected = selectedOptions[opt.name] === val.name;
                      if (opt.type === "swatch_color" || opt.type === "swatch_image") {
                        return (
                          <button
                            key={val.name}
                            type="button"
                            onClick={() => handleSelectOption(opt.name, val.name)}
                            className={`w-11 h-11 rounded-xs border-2 overflow-hidden bg-white p-0.5 transition-all cursor-pointer ${
                              isSelected ? "border-[#00a896] scale-105" : "border-gray-200"
                            }`}
                          >
                            <img src={val.variantImage || allImages[0]} alt={val.name} className="w-full h-full object-cover" />
                          </button>
                        );
                      }
                      return (
                        <button
                          key={val.name}
                          type="button"
                          onClick={() => handleSelectOption(opt.name, val.name)}
                          className={`min-w-10 h-8 px-3 text-xs font-bold rounded-xs border transition-all cursor-pointer ${
                            isSelected ? "border-[#00a896] bg-teal-50/20 text-[#00a896]" : "bg-white border-gray-200 text-gray-700"
                          }`}
                        >
                          {val.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AKSI TRANSAKSI */}
          <div className="flex flex-wrap gap-3 items-center border-b border-gray-100 pb-5">
            <div className="flex items-center border border-gray-200 rounded-xs bg-gray-50 h-10 shrink-0">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-full flex items-center justify-center font-bold text-slate-500 hover:bg-gray-100">-</button>

              {/* 🌟 DITAMBAHKAN CLASS: [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none */}
              <input 
                type="number" 
                value={quantity} 
                readOnly 
                className="w-10 h-full text-center text-xs font-bold bg-white border-x border-gray-200 text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
              />

              <button onClick={() => setQuantity((q) => q + 1)} className="w-9 h-full flex items-center justify-center font-bold text-slate-500 hover:bg-gray-100">+</button>
            </div>

            {/* 🌟 DIHUBUNGKAN KE LOGIKA SINKRONISASI CARTS DATABASE */}
            <button 
              type="button" 
              disabled={product.stock <= 0} 
              onClick={handleAddToCart}
              className="flex-1 min-w-[180px] h-10 bg-[#00a896] hover:bg-[#009282] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xs transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
            </button>
          </div>

          {/* SEKTOR LOGISTIK DINAMIS */}
          <div className="space-y-2 border-b border-gray-100 pb-5 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Ready to ship in</span>
              <span className="text-slate-700 font-bold">{product.delivery_time ? `${product.delivery_time} Business Days` : "1-3 Business Days"}</span>
            </div>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400">Estimated Delivery:</span>
              <span className="text-slate-700 font-bold">{deliveryEstimation.daysRange}</span>
              <span className="text-sky-500 font-bold hover:underline cursor-pointer flex items-center gap-0.5 ml-1 capitalize">
                from {deliveryEstimation.location} &rsaquo;
              </span>
            </div>
          </div>

          {/* SOCIAL MEDIA SHARE */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Share:</span>
            <div className="flex items-center gap-2">
              {socialIcons.map((soc) => (
                <a
                  key={soc.name}
                  href={soc.shareUrl(currentUrl, product.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-[#00a896] hover:border-[#00a896] flex items-center justify-center transition-all shadow-3xs"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d={soc.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* =========================================================================
            🌟 TABS PANELS
            ========================================================================= */}
        <div id="product-tabs-section" className="mt-6 border-t border-gray-200 pt-6 col-span-1 md:col-span-12">
          
          <div className="flex flex-wrap border-b border-gray-200 gap-2 mb-6">
            {[
              { id: "desc", name: "Description" },
              { id: "info", name: "Additional Information" },
              { id: "shipping", name: "Shipping & Location" },
              { id: "reviews", name: `Reviews (${totalReviews})` },
              { id: "comments", name: "Comments" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wide border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id 
                    ? "border-[#00a896] text-slate-900" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          <div className="p-2 text-slate-600 leading-relaxed text-xs">
            
            {/* TAB 1: DESCRIPTION */}
            {activeTab === "desc" && (
              <div 
                className="prose max-w-none text-slate-600"
                dangerouslySetInnerHTML={{ __html: product.description || "No description available." }}
              />
            )}

            {/* TAB 2: ADDITIONAL INFORMATION */}
            {activeTab === "info" && (
              <div className="max-w-md border border-gray-100 rounded-sm bg-slate-50/50">
                <div className="grid grid-cols-2 p-3 border-b border-gray-100 bg-white">
                  <span className="font-bold text-slate-400">Brand</span>
                  <span className="font-semibold text-slate-700">{product.brands?.name || "Generic"}</span>
                </div>
              </div>
            )}

            {/* TAB 3: SHIPPING & LOCATION */}
            {activeTab === "shipping" && (
              <div className="space-y-6">
                <div className="max-w-xl space-y-4 border border-gray-200 p-4 bg-white rounded-sm">
                  <div>
                    <span className="block font-bold text-slate-700 mb-2">Select Your Location</span>
                    <div className="grid grid-cols-2 gap-3">
                      <select 
                        value={selectedShipCountry}
                        onChange={(e) => {
                          setSelectedShipCountry(e.target.value);
                          setSelectedShipState(""); 
                        }}
                        className="border border-gray-200 h-9 px-2 bg-white rounded-xs outline-none text-slate-600 text-xs cursor-pointer"
                      >
                        <option value="">Select Country</option>
                        {shippingCountries.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>

                      <select 
                        value={selectedShipState}
                        disabled={!selectedShipCountry || shippingStates.length === 0}
                        onChange={(e) => setSelectedShipState(e.target.value)}
                        className="border border-gray-200 h-9 px-2 bg-white rounded-xs outline-none text-slate-600 text-xs cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select State/Province</option>
                        {shippingStates.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="text-xs pt-2 border-t border-gray-100">
                    <div className="flex py-1">
                      <span className="w-28 text-slate-400 font-medium">Shipping Cost</span>
                      <span className="font-bold text-slate-700">: {calculatedShippingCost}</span>
                    </div>
                    <div className="flex py-1">
                      <span className="w-28 text-slate-400 font-medium">Shipping</span>
                      <span className="font-bold text-slate-700">: Ready to ship in {product.delivery_time || "1-3"} Business Days</span>
                    </div>
                    <div className="flex py-1">
                      <span className="w-28 text-slate-400 font-medium">Product Location</span>
                      <span className="font-bold text-sky-600 capitalize">: {product.city || "N/A"}, {product.state || "N/A"}, {product.country || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full h-64 border border-gray-200 bg-slate-100 rounded-sm overflow-hidden relative shadow-2xs">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(
                      `${product.city || ""}, ${product.state || ""}, ${product.country || ""}`
                    )}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: REVIEWS */}
            {/* TAB 4: REVIEWS PANEL (MODESY STYLE WITH ADD REVIEW BUTTON) */}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                
                {/* RATING HEADER & TOMBOL TRIGGER ADD REVIEW */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex text-amber-400 gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < Math.round(averageRating) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`} />
                      ))}
                    </div>
                    <span className="font-bold text-slate-800 text-sm">
                      Reviews ({totalReviews})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUserProfile?.id) {
                        toast.error("You must log in first to write a review!");
                        return;
                      }
                      setIsReviewModalOpen(true);
                    }}
                    className="h-9 px-4 bg-[#00a896] hover:bg-[#009282] text-white text-xs font-bold rounded-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> 
                    {userExistingReview ? "Update Review" : "Add Review"}
                  </button>
                </div>

                {/* LIST REVIEW KONTEN */}
                <div className="space-y-4">
                  {totalReviews === 0 ? (
                    <p className="text-slate-400 text-xs italic p-2">No reviews yet for this product.</p>
                  ) : (
                    product.product_reviews.map((rev: any) => (
                      <div key={rev.id} className="py-4 border-b border-gray-50 flex gap-4 items-start">
                        {/* Avatar Bulat Default Modesy */}
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase text-xs shrink-0 border border-gray-100 shadow-3xs">
  {rev.profiles?.avatar_url ? (
    <img 
      src={rev.profiles.avatar_url} 
      alt={`${rev.profiles?.first_name || "User"}'s avatar`} 
      className="w-full h-full object-cover"
    />
  ) : (
    rev.profiles?.first_name?.substring(0, 1) || "U"
  )}
</div>
                        
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-bold text-slate-800 text-xs capitalize">
                              {rev.profiles?.first_name} {rev.profiles?.last_name || ""}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(rev.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          {/* Bintang Skor Setiap User */}
                          <div className="flex text-amber-400 gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`} />
                            ))}
                          </div>

                          {/* Teks Ulasan */}
                          <p className="text-slate-600 text-xs bg-slate-50/40 p-2.5 rounded-xs border border-gray-100/30 leading-relaxed font-medium">
                            {rev.review_text || "No written review text provided."}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* MODAL COMPONENT PORTAL INJECTOR */}
                <AddReviewModal
                  isOpen={isReviewModalOpen}
                  onClose={() => setIsReviewModalOpen(false)}
                  productId={product.id}
                  currentUserId={currentUserProfile?.id || null}
                  existingReview={userExistingReview}
                  onSuccess={(newReview) => {
                    // Cek jika review sudah ada, lakukan update di array lokal state
                    if (userExistingReview) {
                      product.product_reviews = product.product_reviews.map((r: any) => 
                        r.user_id === currentUserProfile.id ? newReview : r
                      );
                    } else {
                      product.product_reviews = [newReview, ...product.product_reviews];
                    }
                    // Trigger UI state force re-render tab reviews
                    setActiveTab("desc");
                    setTimeout(() => setActiveTab("reviews"), 10);
                  }}
                />
              </div>
            )}

            {/* TAB 5: COMMENTS */}
            {activeTab === "comments" && (
              <div className="space-y-6">
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {Array.isArray(product.product_comments) && product.product_comments
                    .filter((c: any) => c.parent_id === null)
                    .map((parentComm: any) => {
                      const isParentOwner = currentUserProfile?.id === parentComm.user_id;
                      const isProductOwner = currentUserProfile?.id === product.user_id;
                      const parentName = `${parentComm.profiles?.first_name || "User"} ${parentComm.profiles?.last_name || ""}`.trim();

                      return (
                        <div key={parentComm.id} className="space-y-3 border-b border-gray-50 pb-4">
                          <div className="flex gap-3 items-start bg-slate-50/40 p-3 rounded-xs border border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-slate-200 font-bold flex items-center justify-center text-slate-400 uppercase text-xs shrink-0">
                              {parentName.substring(0, 1)}
                            </div>
                            <div className="flex-1 space-y-1">
                              <span className="font-bold text-slate-800 text-xs block capitalize">{parentName}</span>
                              <p className="text-slate-600 text-xs">{parentComm.comment_text}</p>
                              
                              <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-slate-400">
                                <button onClick={() => setReplyToId(parentComm.id)} className="hover:text-[#00a896] cursor-pointer">Reply</button>
                                {(isParentOwner || isProductOwner) && (
                                  <button 
                                    onClick={() => handleDeleteComment(parentComm.id)} 
                                    className="hover:text-rose-500 cursor-pointer text-rose-400/90"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pl-10 space-y-2">
                            {product.product_comments
                              .filter((c: any) => c.parent_id === parentComm.id)
                              .map((childComm: any) => {
                                const isChildOwner = currentUserProfile?.id === childComm.user_id;
                                const childName = `${childComm.profiles?.first_name || "User"} ${childComm.profiles?.last_name || ""}`.trim();
                                
                                return (
                                  <div key={childComm.id} className="flex gap-3 items-start bg-slate-50/20 p-2.5 border-l-2 border-gray-200 rounded-r-xs">
                                    <div className="w-7 h-7 rounded-full bg-slate-200 font-bold flex items-center justify-center text-slate-400 uppercase text-[10px] shrink-0">
                                      {childName.substring(0, 1)}
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                      <span className="font-bold text-slate-800 text-[11px] block capitalize">{childName}</span>
                                      <p className="text-slate-600 text-xs">{childComm.comment_text}</p>
                                      
                                      {(isChildOwner || isProductOwner) && (
                                        <div className="pt-0.5">
                                          <button 
                                            onClick={() => handleDeleteComment(childComm.id)} 
                                            className="text-[10px] font-bold text-rose-400/90 hover:text-rose-500 cursor-pointer"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}

                  {(!product.product_comments || product.product_comments.length === 0) && (
                    <p className="text-xs text-slate-400 italic p-2">No comments on this product yet. Be the first!</p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="block font-bold text-slate-700 text-xs">
                      {replyToId ? "Reply to comment:" : "Add Comment"}
                    </span>
                    {replyToId && (
                      <span className="text-[10px] text-slate-400">
                        Replying to comment ID: #{replyToId}
                      </span>
                    )}
                  </div>
                  <textarea 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={replyToId ? "Write your reply..." : "Write your message here..."} 
                    className="w-full border border-gray-200 rounded-sm p-3 text-xs outline-none focus:border-[#00a896] h-20 bg-white text-slate-700 shadow-3xs"
                  />
                  <div className="flex justify-end gap-2">
                    {replyToId && (
                      <button 
                        type="button"
                        onClick={() => {
                          setReplyToId(null);
                          setCommentText("");
                        }} 
                        className="px-4 h-8 bg-slate-100 hover:bg-slate-200 rounded-xs text-xs font-semibold text-slate-600 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="button"
                      disabled={isSubmittingComment || !commentText.trim()}
                      onClick={handleSubmitComment}
                      className="px-5 h-8 bg-[#00a896] hover:bg-[#009282] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xs text-white text-xs font-bold cursor-pointer transition-all shadow-2xs"
                    >
                      {isSubmittingComment ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* 🌟 ACTION FOOTER: INTEGRASI DYNAMIC AFFILIATE LINK */}
          <div className="flex items-center gap-4 justify-end pt-4 text-[10px] font-semibold text-slate-400 border-t border-gray-100 mt-6">
            {product.is_affiliate ? (
              currentUserProfile?.id === product.user_id ? (
                <span className="text-amber-600 font-medium opacity-80 animate-pulse" title="You cannot affiliate your own product">
                  &uarr; Affiliate link disabled for your own store
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isGeneratingRef}
                  onClick={handleCreateAffiliateLink}
                  className="text-[#00a896] hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50 font-bold transition-all"
                >
                  &uarr; {isGeneratingRef ? "Generating Link..." : "Create affiliate link"}
                  {product.affiliate_commission_rate && (
                    <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 text-[9px] rounded-xs font-extrabold border border-emerald-200">
                      Earn {product.affiliate_commission_rate}%
                    </span>
                  )}
                </button>
              )
            ) : (
              <span className="cursor-not-allowed opacity-40 font-medium" title="This product does not support affiliate commissions">
                &uarr; Create affiliate link (Disabled)
              </span>
            )}
            
            <button 
              type="button"
              onClick={() => {
                if (!currentUserProfile?.id) {
                  toast.error("You must log in first to report a product!");
                  return;
                }
                setIsReportModalOpen(true);
              }}
              className="text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <TriangleAlert className="w-4 h-4" /> Report this product
            </button>
            
            <ReportProductModal 
              isOpen={isReportModalOpen} 
              onClose={() => setIsReportModalOpen(false)} 
              productId={product.id}
              currentUserId={currentUserProfile?.id || null}
            />
            {/* MODAL PORTAL: ADD TO CART SUMMARY MODESY STYLE */}
      <AddToCartSuccessModal 
        isOpen={isCartSuccessModalOpen}
        onClose={() => setIsCartSuccessModalOpen(false)}
        productTitle={product.title}
        productPrice={finalPrice}
        productImage={allImages[activeImgIndex] || allImages[0]}
        addedQuantity={lastAddedQty}
      />
      <AskQuestionModal
  isOpen={isAskModalOpen}
  onClose={() => setIsAskModalOpen(false)}
  productId={product.id}
  productTitle={product.title}
  sellerId={product.user_id}
  sellerName={sellerFullName}
  sellerEmail={product.profiles?.email || ""} // Sesuaikan kueri profil email penjuallu jika ada
  currentUserId={currentUserProfile?.id || null}
/>
          </div>
        </div>

      </div>
    </div>
  );
}
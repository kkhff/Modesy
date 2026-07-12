import React from "react";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Mail, Phone, Calendar, Star } from "lucide-react";
import Link from "next/link";
import HeadersProfileMenu from "./HeadersProfileMenu"; // Client component pembantu tracking active tab

interface UserProfile {
  id: string;
  email: string;
  slug: string;
  first_name: string;
  last_name: string;
  role: "admin" | "vendor" | "moderator" | "member";
  phone_number: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  created_at: string;
  overall_rating: number;
}

const SOCIAL_MAP = [
  { key: "facebook_url", name: "facebook", path: "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" },
  { key: "twitter_url", name: "twitter", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { key: "instagram_url", name: "instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
  { key: "tiktok_url", name: "tiktok", path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.17.98 1.13 2.37 1.84 3.84 2.08v3.9c-1.67-.03-3.29-.62-4.6-1.66v6.24c.03 2.22-1.12 4.35-3.03 5.48-1.92 1.14-4.37 1.24-6.38.25-2.01-.98-3.32-3.06-3.41-5.32-.12-2.91 2.05-5.5 4.94-5.95.73-.11 1.48-.04 2.19.19v4.03c-.53-.19-1.1-.22-1.65-.09-1.14.24-1.92 1.27-1.87 2.43.04 1.16.92 2.11 2.08 2.22 1.16.1 2.19-.68 2.42-1.81.07-.33.09-.68.08-1.02V0z" },
  { key: "whatsapp_url", name: "whatsapp", path: "M12.004 2C6.48 2 2 6.48 2 12.004c0 1.708.43 3.38 1.25 4.86L2 22l5.304-1.392c1.432.784 3.052 1.2 4.7 1.2 5.524 0 10.004-4.476 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm6.276 14.18c-.26.732-1.508 1.34-2.084 1.416-.564.076-1.132.104-3.64-.912-3.212-1.304-5.228-4.576-5.388-4.792-.16-.216-1.284-1.716-1.284-3.276 0-1.556.796-2.32 1.08-2.616.284-.296.62-.372.828-.372.208 0 .416.004.6.012.192.008.448-.072.7.544.26.632.888 2.17.964 2.324.076.156.128.336.024.544-.104.212-.156.344-.312.524-.156.18-.328.404-.468.54-.156.152-.32.316-.136.632.184.312.82 1.348 1.756 2.184.936.832 1.724 1.092 2.04 1.248.316.156.504.132.688-.08.184-.212.8-.932 1.016-1.252.216-.32.432-.268.728-.156.296.116 1.884.888 2.204 1.048.32.16.532.24.608.372.08.132.08.764-.18 1.496z" },
  { key: "youtube_url", name: "youtube", path: "M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
  { key: "discord_url", name: "discord", path: "M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.075 0 01.078.009c.12.099.246.195.373.289a.075.075 0 01-.006.127 12.298 12.298 0 01-1.873.894.077.077 0 01-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" },
  { key: "telegram_url", name: "telegram", path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" },
  { key: "pinterest_url", name: "pinterest", path: "M12.017 0C5.396 0 0 5.396 0 12.017c0 5.082 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.008 2.35-1.5 3.146a12.039 12.039 0 005.158 1.177c6.621 0 12.017-5.396 12.017-12.017C24.034 5.396 18.638 0 12.017 0z" },
  { key: "linkedin_url", name: "linkedin", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" },
  { key: "twitch_url", name: "twitch", path: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" },
  { key: "vk_url", name: "vk", path: "M22.18 0H1.82A1.82 1.82 0 000 1.82v20.36A1.82 1.82 0 001.82 24h20.36A1.82 1.82 0 0024 22.18V1.82A1.82 1.82 0 0022.18 0zM17.9 16.52h-1.46c-.56 0-.8-.44-1.63-1.27-.72-.7-1-.78-1.21-.78-.28 0-.37.08-.37.49v1.07c0 .49-.16.49-1.41.49-2.07 0-4.38-1.43-5.94-3.66-2.35-3.23-2.92-5-2.92-5.46 0-.3.12-.41.59-.41h1.46c.41 0 .54.18.66.49a11.17 11.17 0 002.13 3.52c.48.48.69.64.91.64.12 0 .22-.05.22-.38v-2.36c0-.75-.11-.84-.53-.84h-.4c-.21 0-.29-.11 0-.27.31-.46 1.07-.75 2-.75h1.16c.49 0 .61.21.61.69v2.88c0 .32.14.43.25.43.22 0 .44-.14.88-.58a14.28 14.28 0 002.04-3.18c.08-.22.25-.47.66-.47h1.46c.44 0 .56.12.44.49a19.45 19.45 0 01-1.89 3.26c-.35.5-.47.69-.13 1 .28.4 1.25 1.24 1.9 1.95.84.93 1.13 1.41.87 1.81-.25.32-.57.32-.9.32z" },
  { key: "personal_website_url", name: "rss", path: "M6.18 15.64a2.18 2.18 0 11-4.36 0 2.18 2.18 0 014.36 0zM1.82 8.32c5.62 0 10.18 4.56 10.18 10.18h-2.54c0-4.22-3.42-7.64-7.64-7.64zm0-5.78c9.6 0 17.38 7.78 17.38 17.38h-2.54c0-8.2-6.64-14.84-14.84-14.84z" }
];

async function getProfileFullStats(slug: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: profile } = await supabase.from("profiles").select("*").eq("slug", slug).maybeSingle();
  if (!profile) return { profile: null, counts: null, socials: null };

  // 🔥 MENGHUBUNGKAN DATA DENGAN COUNTER REAL-TIME DARI DB
  // 🔥 MENGHUBUNGKAN DATA DENGAN COUNTER REAL-TIME DARI DB (FIXED JOIN)
  const [followersCount, followingCount, productsCount, reviewsCount, myReviewsCount] = await Promise.all([
    supabase.from("user_followers").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("user_followers").select("id", { count: "exact", head: true }).eq("follower_id", profile.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    
    // 🌟 FIX DI SINI: Join dilakukan lewat penulisan select('*, products!inner(user_id)')
    supabase
      .from("product_reviews")
      .select("id, products!inner(user_id)", { count: "exact", head: true })
      .eq("products.user_id", profile.id),
      
    supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("user_id", profile.id)
  ]);

  const { data: socials } = await supabase.from("user_social_medias").select("*").eq("user_id", profile.id).maybeSingle();

  return {
    profile: profile as UserProfile,
    socials,
    counts: {
      followers: followersCount.count || 0,
      following: followingCount.count || 0,
      products: productsCount.count || 0,
      reviews: reviewsCount.count || 0,
      myReviews: myReviewsCount.count || 0,
    }
  };
}

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { profile, socials, counts } = await getProfileFullStats(slug);

  if (!profile) notFound();

  const isSeller = profile.role === "admin" || profile.role === "vendor";

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen font-sans pb-16">
      <div className="max-w-[1200px] mx-auto px-4 pt-6">
        {/* Cover Banner */}
        <div className="w-full h-64 bg-slate-200 rounded-t-sm overflow-hidden relative">
          {profile.cover_url ? (
            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-700 to-slate-800" />
          )}
        </div>

        {/* Info Bio Header */}
        <div className="w-full bg-white border border-t-0 border-gray-200 rounded-b-sm p-6 flex flex-col md:flex-row gap-6 relative">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white bg-slate-100 shrink-0 md:-mt-20 z-10 shadow-sm">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-slate-400 font-bold text-3xl uppercase">
                {profile.first_name.substring(0, 2)}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-2xl font-bold text-gray-800 capitalize">
                {profile.first_name} {profile.last_name}
              </h1>
              {profile.role === "admin" && (
                <span className="bg-teal-500 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">Verified Admin</span>
              )}
              
              {/* 🌟 RATING BINTANG REAL-TIME HASIL TRIGGER DB */}
              {isSeller && (
                <div className="flex items-center gap-1 ml-2 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-bold text-gray-700">{Number(profile.overall_rating).toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              {isSeller && (
                <>
                  {profile.phone_number && <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {profile.phone_number}</span>}
                  <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {profile.email}</span>
                </>
              )}
            </div>

            {/* Social Media Links Render */}
            {isSeller && socials && (
              <div className="flex items-center gap-2 pt-1">
                {SOCIAL_MAP.map((soc) => {
                  const filledUrl = socials[soc.key];
                  if (!filledUrl) return null;
                  return (
                    <a
                      key={soc.key}
                      href={filledUrl.startsWith("http") ? filledUrl : `https://${filledUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-[#00a896] hover:border-[#00a896] flex items-center justify-center transition-all shadow-2xs"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d={soc.path} />
                      </svg>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 BARIS TAB KATEGORI UTAMA (Client Component Link Handler) */}
      <div className="max-w-[1200px] mx-auto px-4 pt-10">
        <HeadersProfileMenu slug={slug} isSeller={isSeller} counts={counts} />
        
        {/* Konten Dinamis Sub-Page Rute */}
        <div className="w-full mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
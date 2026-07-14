import React from "react";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { User } from "lucide-react";

// Struktur data profil hasil fetch
interface FollowingProfile {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: string;
}

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  // 1. Cari tahu ID dari profil yang sedang dikunjungi (berdasarkan slug di URL)
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!targetProfile) {
    notFound();
  }

  // 2. Fetch daftar profil orang-orang yang DI-FOLLOW oleh targetProfile ini
  // Trik !inner join: Ambil data profiles yang ID-nya terdaftar di user_id tabel user_followers sebagai target follow
  const { data: following, error } = await supabase
    .from("profiles")
    .select("id, slug, first_name, last_name, avatar_url, role, user_followers!user_followers_user_id_fkey!inner(follower_id)")
    .eq("user_followers.follower_id", targetProfile.id);

  if (error) {
    console.error("Error fetching following:", error.message);
  }

  const followingList = (following as unknown as FollowingProfile[]) || [];

  return (
    <div className="w-full bg-white border border-t-0 border-gray-200 rounded-b-sm p-8 shadow-xs min-h-[300px]">
      
      {followingList.length === 0 ? (
        // STATE KOSONG
        <div className="w-full h-40 flex flex-col items-center justify-center text-gray-400">
          <User className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm font-medium">Not following anyone yet.</p>
        </div>
      ) : (
        // STATE ADA DATA (Grid Tampilan Avatar Modesy)
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-8 gap-x-4">
          {followingList.map((followedUser) => (
            <Link 
              key={followedUser.id} 
              href={`/profile/${followedUser.slug}`}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-gray-100 group-hover:border-[#00a896] transition-colors mb-3 shadow-sm">
                {followedUser.avatar_url ? (
                  <img 
                    src={followedUser.avatar_url} 
                    alt={followedUser.first_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl uppercase">
                    {followedUser.first_name.substring(0, 2)}
                  </div>
                )}
              </div>
              
              <div className="text-center w-full px-1">
                <h4 className="text-[13px] font-bold text-gray-800 truncate group-hover:text-[#00a896] transition-colors capitalize">
                  {followedUser.first_name} {followedUser.last_name}
                </h4>
                
                {/* Badge khusus role */}
                {followedUser.role === "admin" ? (
                  <span className="inline-block mt-0.5 text-[10px] font-bold text-[#00a896] bg-teal-50 px-1.5 py-0.5 rounded-sm">
                    Admin
                  </span>
                ) : (
                  <span className="inline-block mt-0.5 text-[11px] text-gray-400 capitalize">
                    {followedUser.role}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      
    </div>
  );
}
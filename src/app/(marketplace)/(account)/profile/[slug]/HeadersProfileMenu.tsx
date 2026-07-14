"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuProps {
  slug: string;
  isSeller: boolean;
  counts: {
    followers: number;
    following: number;
    products: number;
    reviews: number;
    myReviews: number;
  };
}

export default function HeadersProfileMenu({ slug, isSeller, counts }: MenuProps) {
  const pathname = usePathname();

  const baseRoute = `/profile/${slug}`;
  
  // Fungsi penilai link sedang aktif atau tidak
  const isActive = (path: string) => pathname === path;

  return (
    <div className="w-full border-b border-gray-200 flex flex-wrap gap-6 text-sm font-semibold text-gray-500 bg-white px-6 py-0 rounded-t-sm">
      {isSeller ? (
        <>
          <Link href={`${baseRoute}/products`} className={`pb-3 pt-4 border-b-2 px-1 transition-all ${isActive(`${baseRoute}/products`) ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
            Products ({counts.products})
          </Link>
          <Link href={`${baseRoute}/followers`} className={`pb-3 pt-4 border-b-2 px-1 transition-all ${isActive(`${baseRoute}/followers`) ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
            Followers ({counts.followers})
          </Link>
          <Link href={`${baseRoute}/following`} className={`pb-3 pt-4 border-b-2 px-1 transition-all ${isActive(`${baseRoute}/following`) ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
            Following ({counts.following})
          </Link>
          <Link href={`${baseRoute}/reviews`} className={`pb-3 pt-4 border-b-2 px-1 transition-all ${isActive(`${baseRoute}/reviews`) ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
            Reviews ({counts.reviews})
          </Link>
          <Link href={`${baseRoute}/my-reviews`} className={`pb-3 pt-4 border-b-2 px-1 transition-all ${isActive(`${baseRoute}/my-reviews`) ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
            My Reviews ({counts.myReviews})
          </Link>
          <Link href={`${baseRoute}/shop-policies`} className={`pb-3 pt-4 border-b-2 px-1 transition-all ${isActive(`${baseRoute}/shop-policies`) ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
            Shop Policies
          </Link>
        </>
      ) : (
        <>
          <Link href={`${baseRoute}/followers`} className={`pb-3 pt-4 border-b-2 px-1 transition-all ${isActive(`${baseRoute}/followers`) ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
            Followers ({counts.followers})
          </Link>
          <Link href={`${baseRoute}/following`} className={`pb-3 pt-4 border-b-2 px-1 transition-all ${isActive(`${baseRoute}/following`) ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
            Following ({counts.following})
          </Link>
          <Link href={`${baseRoute}/my-reviews`} className={`pb-3 pt-4 border-b-2 px-1 transition-all ${isActive(`${baseRoute}/my-reviews`) ? "border-[#00a896] text-[#00a896]" : "border-transparent hover:text-gray-800"}`}>
            My Reviews ({counts.myReviews})
          </Link>
        </>
      )}
    </div>
  );
}
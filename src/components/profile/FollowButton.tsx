"use client";

import React, { useEffect, useState } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface FollowButtonProps {
  targetUserId: string;
}

export default function FollowButton({ targetUserId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        setCurrentUserId(session.user.id);

        // Jika ini adalah profil diri sendiri, matikan loading & return
        if (session.user.id === targetUserId) {
          setLoading(false);
          return;
        }

        // Cek apakah data follow sudah ada di tabel user_followers
        const { data, error } = await supabase
          .from("user_followers")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("follower_id", session.user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) setIsFollowing(true);
      } catch (err) {
        console.error("Gagal memeriksa status ikuti:", err);
      } finally {
        setLoading(false);
      }
    };

    checkFollowStatus();
  }, [targetUserId]);

  const handleToggleFollow = async () => {
    if (!currentUserId) {
      toast.error("You must log in first to follow users!");
      return;
    }

    try {
      if (isFollowing) {
        // Aksi Unfollow: Hapus baris dari database
        const { error } = await supabase
          .from("user_followers")
          .delete()
          .eq("user_id", targetUserId)
          .eq("follower_id", currentUserId);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Aksi Follow: Masukkan baris baru ke database
        const { error } = await supabase
          .from("user_followers")
          .insert({
            user_id: targetUserId,
            follower_id: currentUserId,
          });

        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Operasi follow gagal:", err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (loading || currentUserId === targetUserId) return null;

  return (
    <button
      type="button"
      onClick={handleToggleFollow}
      className={`h-9 px-4 border text-xs font-bold rounded-xs flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer ${
        isFollowing
          ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {isFollowing ? (
        <>
          <UserMinus className="w-3.5 h-3.5 text-slate-500" /> Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5 text-gray-400" /> Follow
        </>
      )}
    </button>
  );
}
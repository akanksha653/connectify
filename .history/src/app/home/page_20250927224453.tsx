"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/authContext";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebaseConfig";
import AnonymousChatRoom from "../../../features/anonymousChat/components/AnonymousChatRoom";

export default function AnonymousPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // User not logged in, redirect to login/register page
      router.replace("/auth");
      return;
    }

    // Verify user exists in Realtime Database
    const checkUser = async () => {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        // If user not found in DB, redirect
        router.replace("/auth");
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [userId, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
      <div className="max-w-screen-2xl mx-auto h-full">
        <AnonymousChatRoom />
      </div>
    </main>
  );
}

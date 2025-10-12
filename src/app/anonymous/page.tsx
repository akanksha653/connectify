"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/authContext";
import AnonymousChatRoom from "../../../features/anonymousChat/components/AnonymousChatRoom";

export default function AnonymousPage() {
  const router = useRouter();
  const { userId, loading } = useAuth();

  // Redirect to /auth if not logged in
  useEffect(() => {
    if (!loading && !userId) {
      router.replace("/auth");
    }
  }, [userId, loading, router]);

  // Show loading while checking auth state
  if (loading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
        <p className="text-lg text-neutral-700 dark:text-neutral-300">
          Checking authentication...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
      <div className="max-w-screen-2xl mx-auto h-full">
        <AnonymousChatRoom />
      </div>
    </main>
  );
}

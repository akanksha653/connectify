"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import AnonymousChatRoom from "../../../features/anonymousChat/components/AnonymousChatRoom";

export default function AnonymousPage() {
  const router = useRouter();

  useEffect(() => {
    const userInfo = localStorage.getItem("user-info");

    if (!userInfo) {
      // Redirect to home if user is not registered
      router.replace("/");
    }
  }, [router]);

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
      <div className="max-w-screen-2xl mx-auto h-full">
        <AnonymousChatRoom />
      </div>
    </main>
  );
}

"use client";

import React from "react";
import AnonymousChatRoom from "../../../features/anonymousChat/components/AnonymousChatRoom";

export default function AnonymousPage() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
      <div className="max-w-screen-2xl mx-auto h-full">
        <AnonymousChatRoom />
      </div>
    </main>
  );
}

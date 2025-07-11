"use client";

import React from "react";
// Update the import path below to the correct relative path if needed
import AnonymousChatRoom from "../../../features/anonymousChat/components/AnonymousChatRoom";

export default function AnonymousPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 px-4">
      <AnonymousChatRoom />
    </main>
  );
}

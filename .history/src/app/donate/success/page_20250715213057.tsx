// app/donate/success/page.tsx
"use client";

import { Heart } from "lucide-react";
import Link from "next/link";

export default function DonateSuccessPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-16 text-center text-neutral-800 dark:text-neutral-100">
      <div className="flex justify-center mb-4">
        <Heart className="w-10 h-10 text-pink-600 animate-pulse" />
      </div>
      <h1 className="text-3xl font-bold mb-3">Thank You!</h1>
      <p className="mb-6">
        Your donation means the world to us 💖. You’re helping keep Connectify alive and thriving.
      </p>
      <Link
        href="/"
        className="inline-block px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow transition"
      >
        Back to Home
      </Link>
    </main>
  );
}

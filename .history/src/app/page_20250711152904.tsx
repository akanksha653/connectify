"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-neutral-900 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold mb-6 text-neutral-800 dark:text-neutral-100">
          Connect Anonymously
        </h1>

        <p className="mb-10 text-neutral-600 dark:text-neutral-300">
          Meet strangers worldwide via private video and text chat. No registration required.
        </p>

        <Link
          href="/anonymous"
          className="inline-block w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-base px-6 py-3 rounded-md transition"
        >
          Start Chatting
        </Link>
      </div>

      <footer className="mt-16 text-xs text-neutral-500">
        © {new Date().getFullYear()} MyOmegleClone. All rights reserved.
      </footer>
    </main>
  );
}

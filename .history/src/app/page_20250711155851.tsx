"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 px-4">
      <div className="max-w-md w-full text-center p-8 rounded-xl shadow-lg bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-neutral-900 dark:text-white tracking-tight">
          Connect Anonymously
        </h1>

        <p className="mb-8 text-neutral-700 dark:text-neutral-300 text-base sm:text-lg">
          Meet strangers worldwide via private video and text chat. No registration required.
        </p>

        <Link
          href="/anonymous"
          className="inline-block w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-base px-6 py-3 rounded-md shadow-md hover:shadow-lg transition duration-200 ease-in-out"
        >
          Start Chatting
        </Link>
      </div>

      <footer className="mt-12 text-xs text-neutral-500">
        © {new Date().getFullYear()} MyOmegleClone. All rights reserved.
      </footer>
    </main>
  );
}

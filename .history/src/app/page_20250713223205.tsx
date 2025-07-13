"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handleStartChatting = () => {
    router.push("/anonymous");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 px-4">
      <section className="max-w-md w-full text-center p-8 rounded-xl shadow-xl bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md transition-all">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-4">
          Connect Anonymously
        </h1>

        <p className="text-base sm:text-lg text-neutral-700 dark:text-neutral-300 mb-6">
          Meet strangers worldwide via private video and text chat — no registration required.
        </p>

        <button
          onClick={handleStartChatting}
          className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-md shadow-md hover:shadow-lg transition-all"
        >
          Start Chatting
        </button>
      </section>

      <footer className="mt-12 text-xs text-neutral-500 dark:text-neutral-400">
        © {new Date().getFullYear()} Connectify. All rights reserved.
      </footer>
    </main>
  );
}

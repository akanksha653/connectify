"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../auth/authContext";

export default function HomePage() {
  const router = useRouter();
  const { userId } = useAuth();

  // Redirect to login/register if not logged in
  if (!userId) {
    router.replace("/auth");
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 px-4">
      <div className="max-w-md w-full text-center p-6 rounded-2xl shadow-2xl bg-white/90 dark:bg-neutral-900/80 backdrop-blur-md space-y-6">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          Welcome to Connectify
        </h1>
        <p className="text-neutral-700 dark:text-neutral-300">
          Choose how you want to chat
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push("/anonymous/chat")}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition"
          >
            Anonymous Chat
          </button>

          <button
            onClick={() => router.push("/rooms")}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md shadow-md transition"
          >
            Chat in Room
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./auth/authContext";

export default function HomePage() {
  const router = useRouter();
  const { userId, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200 dark:from-neutral-900 dark:to-neutral-800">
        <p className="text-xl text-neutral-700 dark:text-neutral-300">Checking authentication...</p>
      </div>
    );
  }

  if (userId) {
    router.push("/anonymous");
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-blue-100 to-purple-200 dark:from-neutral-900 dark:to-neutral-800">
      <div className="text-center max-w-md p-6 rounded-2xl bg-white/90 dark:bg-neutral-900/80 shadow-2xl backdrop-blur-md">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
          Welcome to Connectify
        </h1>

        <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 mb-6">
          Connect with strangers worldwide via anonymous private chat or join group rooms.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push("/auth/login")}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition"
          >
            Login
          </button>

          <button
            onClick={() => router.push("/auth/register")}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md shadow-md transition"
          >
            Register
          </button>
        </div>
      </div>

      <footer className="mt-10 text-xs text-neutral-500 dark:text-neutral-400 text-center px-4">
        © {new Date().getFullYear()} Connectify. All rights reserved.
      </footer>
    </main>
  );
}

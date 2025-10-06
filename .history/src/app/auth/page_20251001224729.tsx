"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./authContext";
import { useEffect } from "react";

export default function AuthLandingPage() {
  const router = useRouter();
  const { userId } = useAuth();

  // If user is already logged in, redirect to /home
  useEffect(() => {
    if (userId) {
      router.replace("/home");
    }
  }, [userId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 space-y-6 bg-gradient-to-br from-blue-100 to-purple-200 dark:from-neutral-900 dark:to-neutral-800">
      <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white">
        Welcome to Connectify
      </h1>
      <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 text-center max-w-md">
        Anonymous real-time video and text chat. Login if you already have an account or register to get started.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => router.push("/auth/login")}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition"
        >
          Login
        </button>

        <button
          onClick={() => router.push("/auth/register")}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md shadow-md transition"
        >
          Register
        </button>
      </div>
    </div>
  );
}

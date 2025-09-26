"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{
    name: string;
    age: string;
    country: string;
    avatar?: string;
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user-info");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.name && parsed.age && parsed.country) {
          setUserInfo(parsed);
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    } else {
      router.push("/");
    }
  }, [router]);

  if (!userInfo) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 px-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-neutral-300 dark:border-neutral-700">
        <h1 className="text-2xl font-semibold mb-6">Your Profile</h1>

        {/* Avatar */}
        <div className="flex justify-center">
          {userInfo.avatar ? (
            userInfo.avatar.startsWith("data:") || userInfo.avatar.startsWith("http") ? (
              <img
                src={userInfo.avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border border-neutral-300 dark:border-neutral-700 mb-6"
              />
            ) : (
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700 mb-6">
                {userInfo.avatar}
              </div>
            )
          ) : (
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700 mb-6">
              👤
            </div>
          )}
        </div>

        <div className="text-left space-y-4">
          <div>
            <p className="text-sm text-neutral-500">Name</p>
            <p className="text-lg font-medium">{userInfo.name}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Age</p>
            <p className="text-lg font-medium">{userInfo.age}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Country</p>
            <p className="text-lg font-medium">{userInfo.country}</p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push("/anonymous")}
            className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition"
          >
            Back to Chat
          </button>
        </div>
      </div>
    </main>
  );
}

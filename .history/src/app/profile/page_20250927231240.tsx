"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/authContext";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebaseConfig";

interface UserInfo {
  name: string;
  age: number;
  country: string;
  avatar?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { userId, loading } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (!loading && !userId) {
      router.replace("/auth");
      return;
    }

    if (userId) {
      const fetchUser = async () => {
        try {
          const userRef = ref(database, `users/${userId}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            setUserInfo(snapshot.val());
          } else {
            router.replace("/auth");
          }
        } catch (err) {
          console.error(err);
          router.replace("/auth");
        }
      };
      fetchUser();
    }
  }, [userId, loading, router]);

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
        <p className="text-xl text-neutral-700 dark:text-neutral-300">Loading profile...</p>
      </div>
    );
  }

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
            onClick={() => router.push("/home")}
            className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition"
          >
            Back to Chat
          </button>
        </div>
      </div>
    </main>
  );
}

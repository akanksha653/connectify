"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, ChevronDown } from "lucide-react";
import { useAuth } from "../../src/app/auth/authContext"; // your Firebase auth context
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebaseConfig";

export default function ProfileDropdown() {
  const { userId } = useAuth();
  const [userInfo, setUserInfo] = useState<{ name: string; age: string; country: string } | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user info from Firebase Realtime Database
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setUserInfo({ name: data.name, age: String(data.age), country: data.country });
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };
    fetchUser();
  }, [userId]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!userInfo) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
      >
        <UserCircle className="w-6 h-6" />
        <span>{userInfo.name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 z-50 p-4 space-y-2">
          <div>
            <p className="text-xs text-neutral-500">Name</p>
            <p className="font-medium">{userInfo.name}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Age</p>
            <p className="font-medium">{userInfo.age}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Country</p>
            <p className="font-medium">{userInfo.country}</p>
          </div>

          <hr className="border-neutral-300 dark:border-neutral-600" />

          <button
            onClick={() => router.push("/profile")}
            className="text-sm w-full text-left text-blue-600 hover:underline"
          >
            View Full Profile
          </button>
          <button
            onClick={() => {
              // Logout: clear auth state and redirect
              localStorage.removeItem("user-info");
              router.push("/");
              window.location.reload(); // optional: force reload to reset auth state
            }}
            className="text-sm w-full text-left text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnonymousChatRoom, {
  UserInfo, // <-- import the type from AnonymousChatRoom for consistency
} from "./components/AnonymousChatRoom";
import { auth, db } from "../../lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function AnonymousChatPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    // listen for login state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          // if profile not set up yet
          router.replace("/profile-setup");
          return;
        }

        const data = docSnap.data();
        setUserInfo({
          uid: user.uid,
          name: data.name || user.displayName || "Anonymous",
          age: data.age || "",
          gender: data.gender || "",
          country: data.country || "",
          email: user.email || "",
        });
      } catch (err) {
        console.error("🔥 Failed to fetch user profile:", err);
        router.replace("/auth/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
        <p className="text-lg text-neutral-700 dark:text-neutral-300">
          Loading your profile…
        </p>
      </div>
    );
  }

  return <AnonymousChatRoom userInfo={userInfo} />;
}

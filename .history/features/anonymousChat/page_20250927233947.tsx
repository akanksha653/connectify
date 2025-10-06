"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnonymousChatRoom from "./components/AnonymousChatRoom";
import { auth, db } from "../../lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function AnonymousChatPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch additional profile data from Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserInfo({
            uid: user.uid,
            name: data.name || user.displayName || "Anonymous",
            age: data.age || "",
            gender: data.gender || "",
            country: data.country || "",
            email: user.email,
          });
        } else {
          // Firestore doc missing: redirect to profile setup page
          router.push("/profile-setup");
        }
      } else {
        router.push("/auth/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
        <p className="text-lg text-neutral-700 dark:text-neutral-300">
          Loading your profile...
        </p>
      </div>
    );
  }

  return <AnonymousChatRoom userInfo={userInfo} />;
}

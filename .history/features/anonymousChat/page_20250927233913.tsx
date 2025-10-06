"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnonymousChatRoom from "./components/AnonymousChatRoom";
import { auth } from "../../lib/firebaseConfig"; // your existing config
import { onAuthStateChanged } from "firebase/auth";

export default function AnonymousChatPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // You can also fetch additional user info from Firestore if needed
        setUserInfo({
          uid: user.uid,
          name: user.displayName || "Anonymous",
          email: user.email,
        });
      } else {
        router.push("/auth/login"); // redirect to login if not logged in
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

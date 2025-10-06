"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../app/auth/authContext";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // User already logged in → redirect to anonymous chat
      router.push("/anonymous");
    } else {
      // Not logged in → redirect to auth page
      router.push("/auth");
    }
  }, [user, router]);

  return null; // Optional: show a loader while redirecting
}

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AnonymousChatRoom from "../../../features/anonymousChat/components/AnonymousChatRoom";
import Image from "next/image";

export default function AnonymousPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user-info");

    if (stored) {
      setUserInfo(JSON.parse(stored));
    } else {
      router.replace("/");
    }
  }, [router]);

  if (!userInfo || start) {
    // If no userInfo or start chatting is pressed, show chat room
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
        <div className="max-w-screen-2xl mx-auto h-full">
          <AnonymousChatRoom />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200 dark:from-neutral-900 dark:to-neutral-800">
      <motion.div
        className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center"
        initial={{ opacity: 0, scale: 0.95, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-4 w-24 h-24 rounded-full border-4 border-blue-500 overflow-hidden"
        >
          <Image
            src={userInfo?.avatar || "/default-avatar.png"}
            alt="Avatar"
            width={96}
            height={96}
            className="object-cover w-full h-full"
          />
        </motion.div>

        <motion.h1
          className="text-2xl font-bold text-neutral-800 dark:text-white mb-2"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Welcome back, {userInfo?.name}! 👋
        </motion.h1>

        <motion.p
          className="text-sm text-neutral-600 dark:text-neutral-300 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Age: <strong>{userInfo?.age}</strong> | Country:{" "}
          <strong>{userInfo?.country}</strong>
        </motion.p>

        <motion.button
          onClick={() => setStart(true)}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg transition"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🚀 Start Chatting
        </motion.button>
      </motion.div>
    </main>
  );
}

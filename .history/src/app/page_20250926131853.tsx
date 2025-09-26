"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    country: "",
  });

  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user-info");
    if (stored) {
      setUserInfo(JSON.parse(stored));
    }
  }, []);

  const handleStartChatting = () => {
    if (!form.name || !form.age || !form.gender || !form.country) {
      alert("Please fill in all fields.");
      return;
    }
    localStorage.setItem("user-info", JSON.stringify(form));
    router.push("/anonymous");
  };

  const handleResumeChat = () => {
    router.push("/anonymous");
  };

  if (userInfo) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200 dark:from-neutral-900 dark:to-neutral-800 px-4 py-8">
        <motion.div
          className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center"
          initial={{ opacity: 0, scale: 0.95, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-4 w-20 h-20 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 shadow-inner"
          >
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600 dark:text-blue-300"
              animate={{ rotate: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
            >
              <path d="M4 15V9a2 2 0 0 1 2-2h3V4a2 2 0 1 1 4 0v3h3a2 2 0 0 1 2 2v6" />
              <path d="M16 21H8a4 4 0 0 1-4-4v0" />
            </motion.svg>
          </motion.div>

          <motion.h1
            className="text-2xl sm:text-3xl font-bold text-neutral-800 dark:text-white mb-2"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Welcome back, {userInfo.name}! 👋
          </motion.h1>

          <motion.p
            className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Age: <strong>{userInfo.age}</strong> | Country:{" "}
            <strong>{userInfo.country}</strong>
          </motion.p>

          <motion.button
            onClick={handleResumeChat}
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

  // Registration view
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 px-4 py-8 overflow-y-auto">
      <section className="w-full max-w-md text-center p-6 sm:p-8 rounded-2xl shadow-2xl bg-white/90 dark:bg-neutral-900/80 backdrop-blur-md">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white mb-4">
          Connect Anonymously
        </h1>

        <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 mb-6">
          Meet strangers worldwide via private video and text chat — no registration required.
        </p>

        <form className="space-y-4 text-left">
          <input
            type="text"
            placeholder="Name"
            className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            type="number"
            placeholder="Age"
            className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />

          <div>
            <label
              htmlFor="gender-select"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Gender
            </label>
            <select
              id="gender-select"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
            >
              <option value="">Select Gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Country"
            className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
        </form>

        <button
          onClick={handleStartChatting}
          className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-md shadow-md hover:shadow-lg transition-all"
        >
          Start Chatting
        </button>
      </section>

      <footer className="mt-10 text-xs text-neutral-500 dark:text-neutral-400 text-center px-4">
        © {new Date().getFullYear()} Connectify. All rights reserved.
      </footer>
    </main>
  );
}

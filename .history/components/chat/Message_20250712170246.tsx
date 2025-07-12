"use client";

import React from "react";
import { motion } from "framer-motion";

interface MessageProps {
  content: string;
  sender: "me" | "partner";
  timestamp?: string; // optional if backend provides it
}

export default function Message({ content, sender, timestamp }: MessageProps) {
  const formattedTime =
    timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col ${
        sender === "me" ? "items-end" : "items-start"
      } w-full px-2`}
    >
      {/* Sender label + timestamp */}
      <div className="flex items-center gap-2 text-xs mb-1 text-neutral-500 dark:text-neutral-400">
        <span>{sender === "me" ? "You" : "Stranger"}</span>
        <span className="text-[10px]">{formattedTime}</span>
      </div>

      {/* Message bubble */}
      <div
        className={`px-4 py-2 rounded-lg text-sm break-words shadow
        ${sender === "me" ? "bg-blue-600 text-white rounded-br-none" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-bl-none"}
        max-w-[85%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-[50%]`}
      >
        {content}
      </div>
    </motion.div>
  );
}

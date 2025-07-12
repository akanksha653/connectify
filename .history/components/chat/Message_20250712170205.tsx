"use client";

import React from "react";

interface MessageProps {
  content: string;
  sender: "me" | "partner";
}

export default function Message({ content, sender }: MessageProps) {
  return (
    <div
      className={`flex flex-col ${
        sender === "me" ? "items-end" : "items-start"
      } w-full px-2`}
    >
      {/* Sender badge */}
      <span
        className={`text-xs mb-1 ${
          sender === "me" ? "text-blue-500" : "text-neutral-500 dark:text-neutral-400"
        }`}
      >
        {sender === "me" ? "You" : "Stranger"}
      </span>

      {/* Message bubble */}
      <div
        className={`px-4 py-2 rounded-lg text-sm break-words shadow 
        ${sender === "me" ? "bg-blue-600 text-white rounded-br-none" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-bl-none"}
        max-w-[85%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-[50%]`}
      >
        {content}
      </div>
    </div>
  );
}

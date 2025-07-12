"use client";

import React from "react";

interface MessageProps {
  content: string;
  sender: "me" | "partner";
}

export default function Message({ content, sender }: MessageProps) {
  return (
    <div className={`flex flex-col ${sender === "me" ? "items-end" : "items-start"}`}>
      {/* Sender badge */}
      <span
        className={`text-xs mb-1 ${
          sender === "me" ? "text-blue-500" : "text-neutral-500"
        }`}
      >
        {sender === "me" ? "You" : "Stranger"}
      </span>

      {/* Message bubble */}
      <div
        className={`px-4 py-2 rounded-lg text-sm max-w-xs break-words shadow-md ${
          sender === "me"
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-bl-none"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

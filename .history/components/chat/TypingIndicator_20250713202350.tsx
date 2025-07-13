"use client";

import React from "react";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-1 text-sm text-neutral-500 dark:text-neutral-400">
      <span>Stranger is typing</span>
      <div className="flex space-x-1">
        <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

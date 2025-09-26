"use client";

import React from "react";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-sm text-neutral-600 dark:text-neutral-300 max-w-fit shadow-sm">
      <span>Stranger is typing</span>
      <div className="flex space-x-1">
        <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

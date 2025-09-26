"use client";

import React from "react";

interface TypingIndicatorProps {
  name?: string;
}

export default function TypingIndicator({ name }: TypingIndicatorProps) {
  if (!name) return null; // Do not show anything if name is not available

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-sm text-neutral-600 dark:text-neutral-300 max-w-fit shadow-sm">
      <span>{`${name} is typing...`}</span>
      <div className="flex space-x-1">
        <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

"use client";

import React from "react";

interface TypingIndicatorProps {
  name?: string;
  age?: string | number;
}

export default function TypingIndicator({
  name = "Stranger",
  age,
}: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-sm text-neutral-700 dark:text-neutral-200 max-w-fit shadow-md">
      <span className="font-medium">
        {name}
        {age ? ` (${age})` : ""} is typing
      </span>
      <div className="flex space-x-1">
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.2s]" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.1s]" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
      </div>
    </div>
  );
}

"use client";

import React from "react";

export default function FindingPartner() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-20 text-center">
      {/* Spinner */}
      <div
        className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"
        role="status"
        aria-label="Loading spinner"
      />

      {/* Animated text */}
      <p className="text-lg sm:text-xl font-medium text-neutral-700 dark:text-neutral-200">
        Looking for a partner
        <span className="inline-block animate-pulse ml-1">...</span>
      </p>

      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
        Please wait while we connect you anonymously.
      </p>
    </div>
  );
}

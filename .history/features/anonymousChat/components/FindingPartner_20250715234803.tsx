"use client";

import React from "react";

export default function FindingPartner() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-16 sm:py-20 text-center space-y-4">
      {/* Spinner */}
      <div
        className="w-12 sm:w-14 h-12 sm:h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Searching for a partner"
      />

      {/* Main Message */}
      <p className="text-base sm:text-lg md:text-xl font-medium text-neutral-700 dark:text-neutral-200">
        Looking for a partner
        <span className="inline-block animate-pulse ml-1">...</span>
      </p>

      {/* Subtext */}
      <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-xs sm:max-w-sm">
        Please wait while we connect you anonymously.
      </p>
    </div>
  );
}

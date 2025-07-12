"use client";

import React from "react";

export default function FindingPartner() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      {/* Spinner */}
      <div
        className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"
        role="status"
        aria-label="Loading spinner"
      ></div>

      {/* Animated loading text */}
      <p className="text-neutral-700 dark:text-neutral-300 text-lg flex items-center">
        Looking for a partner
        <span className="ml-1 animate-pulse">...</span>
      </p>
    </div>
  );
}

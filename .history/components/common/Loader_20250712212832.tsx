"use client";

import React from "react";

interface LoaderProps {
  size?: number; // Size in pixels
  color?: string; // Tailwind color class e.g. "blue-600"
}

export default function Loader({ size = 40, color = "blue-600" }: LoaderProps) {
  const spinnerSize = `${size}px`;

  return (
    <div className="flex justify-center items-center py-10" role="status" aria-label="Loading">
      <div
        className={`border-4 border-${color} border-t-transparent rounded-full animate-spin`}
        style={{ width: spinnerSize, height: spinnerSize }}
      ></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

"use client";

import React from "react";

interface VideoPlayerProps {
  children: React.ReactNode;
  className?: string; // allows passing extra classes if needed
}

export default function VideoPlayer({ children, className = "" }: VideoPlayerProps) {
  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

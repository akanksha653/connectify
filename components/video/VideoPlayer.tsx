"use client";

import React from "react";

interface VideoPlayerProps {
  children: React.ReactNode;
}

export default function VideoPlayer({ children }: VideoPlayerProps) {
  return <div className="relative w-full h-full bg-black">{children}</div>;
}

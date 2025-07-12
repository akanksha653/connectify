"use client";

import React from "react";
import clsx from "clsx";

interface VideoPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export default function VideoPlayer({
  children,
  className,
  "aria-label": ariaLabel = "Video player container",
  ...rest
}: VideoPlayerProps) {
  return (
    <div
      className={clsx("relative w-full h-full bg-black overflow-hidden", className)}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </div>
  );
}

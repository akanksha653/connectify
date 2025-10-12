"use client";

import React, { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream;
  label?: string;
  isSpeaking?: boolean; // highlight when user is speaking
  className?: string;   // optional custom classes
}

export default function RemoteVideo({
  stream,
  label,
  isSpeaking = false,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = false; // remote video is usually unmuted
    }
  }, [stream]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-md transition-all duration-300
        ${isSpeaking ? "ring-4 ring-green-400 animate-pulse" : ""} hover:scale-105 ${className || ""}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-48 sm:h-56 md:h-64 lg:h-72 object-cover bg-black"
        aria-label={label || "Remote video feed"}
      />

      {/* User Label */}
      {label && (
        <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 text-sm rounded flex items-center gap-1">
          {label}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { FiMicOff } from "react-icons/fi";

interface Props {
  stream: MediaStream | null;
  muted?: boolean;
  label?: string;
  isSpeaking?: boolean; // highlight when speaking
}

export default function LocalVideo({
  stream,
  muted = true,
  label,
  isSpeaking = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-md transition-all duration-300
        ${isSpeaking ? "ring-4 ring-green-400 animate-pulse" : ""} hover:scale-105`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-48 sm:h-56 md:h-64 lg:h-72 object-cover bg-black"
      />

      {/* User Label */}
      {label && (
        <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 text-sm rounded flex items-center gap-1">
          <span>{label}</span>
        </div>
      )}

      {/* Mic Off Indicator */}
      {muted && (
        <div className="absolute top-2 right-2 bg-black/60 p-1 rounded-full">
          <FiMicOff className="text-red-400 w-5 h-5" />
        </div>
      )}
    </div>
  );
}

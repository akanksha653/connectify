"use client";

import React, { useEffect, useRef } from "react";

interface LocalVideoProps {
  stream: MediaStream | null;
}

export default function LocalVideo({ stream }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (stream) {
      videoElement.srcObject = stream;
    } else {
      videoElement.srcObject = null;
    }

    return () => {
      if (videoElement) {
        videoElement.srcObject = null; // cleanup on unmount
      }
    };
  }, [stream]);

  return (
    <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-md overflow-hidden border-2 border-white">
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 bg-opacity-75 text-white text-xs">
          Loading...
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover rounded-md"
      />
    </div>
  );
}

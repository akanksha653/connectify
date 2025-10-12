"use client";

import React, { useEffect, useRef } from "react";

interface RemoteVideoProps {
  stream: MediaStream | null;
}

export default function RemoteVideo({ stream }: RemoteVideoProps) {
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
        videoElement.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-xl">
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 text-white text-sm sm:text-base font-medium text-center px-4">
          Waiting for partner...
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover rounded-xl"
      />
    </div>
  );
}

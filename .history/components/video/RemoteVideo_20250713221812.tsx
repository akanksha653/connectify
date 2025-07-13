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
    <div className="relative w-full h-[300px] md:h-[360px] bg-black rounded-xl overflow-hidden shadow-xl flex-shrink-0">
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 text-white text-base font-medium">
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

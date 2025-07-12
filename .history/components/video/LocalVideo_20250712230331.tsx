"use client";

import React, { useEffect, useRef } from "react";

interface LocalVideoProps {
  stream: MediaStream | null;
}

export default function LocalVideo({ stream }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="absolute bottom-5 right-5 w-36 h-36 border-2 border-white rounded overflow-hidden">
      <div
        className="absolute top-4 left-4 z-50"
        style={{ width: 144, height: 144 }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover rounded-lg border-2 shadow-lg"
        />
      </div>
    </div>
  );
}

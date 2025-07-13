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
    <div className="w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover rounded-xl border-2 border-white shadow-lg"
      />
    </div>
  );
}

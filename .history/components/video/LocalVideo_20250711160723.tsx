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
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="w-32 h-32 md:w-48 md:h-48 rounded-md object-cover absolute bottom-4 right-4 border-2 border-white"
    />
  );
}

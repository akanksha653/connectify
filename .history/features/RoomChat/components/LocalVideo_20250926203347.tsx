"use client";

import React, { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream | null;
  muted?: boolean;
  label?: string;
}

export default function LocalVideo({ stream, muted = true, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-48 rounded-lg bg-black"
      />
      {label && (
        <div className="absolute bottom-1 left-1 bg-black/50 text-white px-2 py-0.5 text-xs rounded">
          {label}
        </div>
      )}
    </div>
  );
}

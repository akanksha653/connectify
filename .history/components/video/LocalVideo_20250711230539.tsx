"use client";

import React, { useEffect, useRef, useState } from "react";

interface LocalVideoProps {
  stream: MediaStream | null;
}

export default function LocalVideo({ stream }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // initial bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    setOffset({
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0),
    });
  };

  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const parent = containerRef.current?.parentElement?.getBoundingClientRect();
    const video = containerRef.current?.getBoundingClientRect();
    if (!parent || !video) return;

    let newX = e.clientX - offset.x - parent.left;
    let newY = e.clientY - offset.y - parent.top;

    // Restrict within parent bounds
    newX = Math.max(0, Math.min(newX, parent.width - video.width));
    newY = Math.max(0, Math.min(newY, parent.height - video.height));

    setPosition({ x: newX, y: newY });
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className="absolute cursor-move"
      style={{ left: position.x, top: position.y }}
      onPointerDown={startDrag}
      onPointerMove={onDrag}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-32 h-32 md:w-48 md:h-48 rounded-md object-cover border-2 border-white shadow-lg"
      />
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";

interface LocalVideoProps {
  stream: MediaStream | null;
  draggable?: boolean;
  initialPosition?: { x: number; y: number };
}

export default function LocalVideo({
  stream,
  draggable = true,
  initialPosition = { x: 20, y: 20 },
}: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Assign stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Start dragging
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    setOffset({
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  // Handle dragging
  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !draggable) return;

    const parent = containerRef.current?.parentElement?.getBoundingClientRect();
    const video = containerRef.current?.getBoundingClientRect();
    if (!parent || !video) return;

    let newX = e.clientX - offset.x - parent.left;
    let newY = e.clientY - offset.y - parent.top;

    // Clamp to container bounds
    newX = Math.max(0, Math.min(newX, parent.width - video.width));
    newY = Math.max(0, Math.min(newY, parent.height - video.height));

    setPosition({ x: newX, y: newY });
  };

  // End dragging
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className={`absolute z-50 transition-transform duration-75 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
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
        className="w-32 h-32 md:w-44 md:h-44 lg:w-56 lg:h-56 rounded-lg object-cover border-2 border-white shadow-xl"
      />
    </div>
  );
}

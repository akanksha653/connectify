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
  initialPosition = { x: 20, y: 100 },
}: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [positionY, setPositionY] = useState(initialPosition.y);
  const [isDragging, setIsDragging] = useState(false);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    setOffsetY(e.clientY - (rect?.top ?? 0));
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !draggable) return;
    const parent = containerRef.current?.parentElement?.getBoundingClientRect();
    const box = containerRef.current?.getBoundingClientRect();
    if (!parent || !box) return;

    let newY = e.clientY - offsetY - parent.top;
    newY = Math.max(0, Math.min(newY, parent.height - box.height));

    setPositionY(newY);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-50 cursor-grab active:cursor-grabbing"
      style={{
        left: initialPosition.x,
        top: positionY,
        width: 180,
        height: 180,
      }}
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
        className="w-full h-full object-cover rounded-lg border-2 border-white shadow-lg pointer-events-none"
        style={{ resize: "none" }}
      />
    </div>
  );
}

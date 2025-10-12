// features/RoomSystem/components/RoomVideoGrid.tsx
import React, { useEffect, useRef } from "react";

type Props = {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
};

export default function RoomVideoGrid({ localStream, remoteStreams }: Props) {
  const localRef = useRef<HTMLVideoElement | null>(null);

  // Attach local stream
  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Combine local + remote streams for dynamic grid
  const allStreams = [
    { id: "local", stream: localStream, isLocal: true },
    ...Object.entries(remoteStreams).map(([id, stream]) => ({ id, stream, isLocal: false })),
  ].filter((s) => s.stream); // remove null streams

  // Dynamic grid classes based on number of participants
  const getGridCols = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    return "grid-cols-3";
  };

  return (
    <div className={`grid ${getGridCols(allStreams.length)} gap-2`}>
      {allStreams.map(({ id, stream, isLocal }) => (
        <VideoTile key={id} stream={stream!} isLocal={isLocal} />
      ))}
    </div>
  );
}

function VideoTile({ stream, isLocal }: { stream: MediaStream; isLocal?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative w-full h-48 bg-black rounded overflow-hidden">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover rounded"
      />
      {isLocal && (
        <div className="absolute bottom-1 right-1 bg-gray-800 text-white text-xs px-1 rounded">
          You
        </div>
      )}
    </div>
  );
}

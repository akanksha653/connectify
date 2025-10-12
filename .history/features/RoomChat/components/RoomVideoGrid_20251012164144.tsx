// features/RoomSystem/components/RoomVideoGrid.tsx
import React, { useEffect, useRef } from "react";

type Props = {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
};

export default function RoomVideoGrid({ localStream, remoteStreams }: Props) {
  const localRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="grid grid-cols-2 gap-2">
      <video ref={localRef} autoPlay muted playsInline className="w-full h-48 bg-black rounded" />
      {Object.entries(remoteStreams).map(([id, stream]) => (
        <RemoteVideo key={id} stream={stream} />
      ))}
    </div>
  );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-48 bg-black rounded" />;
}

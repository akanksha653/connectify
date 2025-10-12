"use client";

import React from "react";
import LocalVideo from "./LocalVideo";
import RemoteVideo from "./RemoteVideo";

interface UserStream {
  id: string;
  stream: MediaStream;
  name: string;
  isSpeaking?: boolean;
}

interface Props {
  localStream: MediaStream | null;
  localName: string;
  remoteStreams: UserStream[];
}

export default function VideoGrid({ localStream, localName, remoteStreams }: Props) {
  const totalUsers = remoteStreams.length + (localStream ? 1 : 0);

  // -------------------------------
  // Determine grid classes dynamically
  // -------------------------------
  const getGridCols = () => {
    if (totalUsers <= 1) return "grid-cols-1";
    if (totalUsers === 2) return "grid-cols-2";
    if (totalUsers <= 4) return "grid-cols-2 md:grid-cols-2";
    if (totalUsers <= 6) return "grid-cols-2 md:grid-cols-3";
    if (totalUsers <= 8) return "grid-cols-2 md:grid-cols-4";
    return "grid-cols-2 md:grid-cols-4 lg:grid-cols-5";
  };

  return (
    <div className={`grid ${getGridCols()} gap-4 p-2`}>
      {/* Local Video */}
      {localStream && (
        <LocalVideo
          stream={localStream}
          label={localName}
          isSpeaking={false} // local speaking indicator can be added if needed
        />
      )}

      {/* Remote Videos */}
      {remoteStreams.map((user) => (
        <RemoteVideo
          key={user.id}
          stream={user.stream}
          label={user.name}
          isSpeaking={user.isSpeaking}
        />
      ))}
    </div>
  );
}

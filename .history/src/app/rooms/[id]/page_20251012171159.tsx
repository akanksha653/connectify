"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoomVideoGrid from "../../../../features/RoomSystem/components/RoomVideoGrid";
import RoomChatBox from "../../../../features/RoomSystem/components/RoomChatBox";
import { useRoomSocket } from "../../../../features/RoomSystem/hooks/useRoomSocket";
import { useRoomWebRTC } from "../../../../features/RoomSystem/hooks/useRoomWebRTC";

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.id as string;

  // Socket-based room management
  const { joinRoom, leaveRoom } = useRoomSocket();

  // Local media stream
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // WebRTC hook for multi-user video
  const { remoteStreams, joinRoom: joinWebRTCRoom, leaveRoom: leaveWebRTCRoom } =
    useRoomWebRTC(localStream);

  // Initialize local media (camera + mic)
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
      } catch (err) {
        console.error("getUserMedia error:", err);
      }
    };
    startMedia();

    return () => {
      // Stop all tracks on unmount
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Join room via socket + WebRTC when ready
  useEffect(() => {
    if (!roomId) return;

    const user = { name: "Guest", country: "Unknown", age: "?" };
    joinRoom(roomId, user); // Socket join
    joinWebRTCRoom(roomId); // WebRTC join

    return () => {
      leaveRoom(roomId); // Socket leave
      leaveWebRTCRoom(); // WebRTC leave
    };
  }, [roomId, localStream, joinRoom, leaveRoom, joinWebRTCRoom, leaveWebRTCRoom]);

  return (
    <div className="p-4 grid grid-cols-3 gap-4 h-screen">
      <div className="col-span-2 flex flex-col gap-2">
        <RoomVideoGrid localStream={localStream} remoteStreams={remoteStreams} />
      </div>
      <div className="flex flex-col">
        <RoomChatBox roomId={roomId} />
      </div>
    </div>
  );
}

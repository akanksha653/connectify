// src/app/rooms/[id]/page.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import RoomVideoGrid from "../../../../features/RoomChat/components/RoomVideoGrid";
import RoomChatBox from "../../../../features/RoomChat/components/RoomChatBox";
import { useRoomSocket } from "../../../../features/RoomChat/hooks/useRoomSocket";
import { useRoomWebRTC } from "../../../../features/RoomChat/hooks/useRoomWebRTC";

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.id as string;
  const { joinRoom, leaveRoom } = useRoomSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const { remoteStreams, joinRoom: joinWebRTCRoom, leaveRoom: leaveWebRTCRoom } = useRoomWebRTC(localStream);

  useEffect(() => {
    // simple getUserMedia
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(s);
      } catch (e) {
        console.error("getUserMedia error", e);
      }
    };
    start();
    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const user = { name: "Guest", country: "Unknown", age: "?" };
    joinRoom(roomId, user);
    joinWebRTCRoom(roomId);

    return () => {
      leaveRoom(roomId);
      leaveWebRTCRoom(roomId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, localStream]);

  return (
    <div className="p-4 grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <RoomVideoGrid localStream={localStream} remoteStreams={remoteStreams} />
      </div>
      <div>
        <RoomChatBox roomId={roomId} />
      </div>
    </div>
  );
}

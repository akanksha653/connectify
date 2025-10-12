"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoomVideoGrid from "../../../../features/RoomChat/components/RoomVideoGrid";
import RoomChatBox from "../../../../features/RoomChat/components/RoomChatBox";
import RoomStatusBar from "../../../../features/RoomChat/components/RoomStatusBar";
import RoomParticipants from "../../../../features/RoomChat/components/RoomParticipants";
import { useRoomSocket } from "../../../../features/RoomChat/hooks/useRoomSocket";
import { useRoomWebRTC } from "../../../../features/RoomChat/hooks/useRoomWebRTC";
import type { Participant } from "../../../../features/RoomChat/utils/roomTypes";

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.id as string;

  // Socket
  const { joinRoom, leaveRoom, socket } = useRoomSocket();

  // Local media
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // WebRTC
  const { remoteStreams, joinRoom: joinWebRTCRoom, leaveRoom: leaveWebRTCRoom } =
    useRoomWebRTC(localStream);

  // Initialize local media
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
        setMediaError("Camera/Microphone access denied or unavailable.");
      }
    };
    startMedia();

    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Join room via socket + WebRTC
  useEffect(() => {
    if (!roomId || !localStream || !socket) return;

    // Build participant object with socketId
    const user: Participant = {
      socketId: socket.id,
      userInfo: {
        name: "Guest",
        country: "Unknown",
        age: "?",
      },
    };

    joinRoom(roomId, user);
    joinWebRTCRoom(roomId);

    return () => {
      leaveRoom(roomId, user);
      leaveWebRTCRoom();
    };
  }, [roomId, localStream, socket, joinRoom, leaveRoom, joinWebRTCRoom, leaveWebRTCRoom]);

  // Toggle camera
  const toggleCamera = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => (track.enabled = !cameraEnabled));
    setCameraEnabled(!cameraEnabled);
  };

  // Toggle microphone
  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => (track.enabled = !micEnabled));
    setMicEnabled(!micEnabled);
  };

  if (mediaError)
    return (
      <div className="flex items-center justify-center h-screen text-red-500 font-semibold">
        {mediaError}
      </div>
    );

  if (!localStream)
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 font-medium">
        Waiting for camera/mic access...
      </div>
    );

  return (
    <div className="p-2 h-screen grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Left: Video + Status */}
      <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
        <RoomStatusBar
          roomId={roomId}
          cameraEnabled={cameraEnabled}
          micEnabled={micEnabled}
          onToggleCamera={toggleCamera}
          onToggleMic={toggleMic}
        />
        <RoomVideoGrid localStream={localStream} remoteStreams={remoteStreams} />
      </div>

      {/* Right: Chat + Participants */}
      <div className="flex flex-col gap-4">
        <RoomChatBox roomId={roomId} />
        <RoomParticipants roomId={roomId} />
      </div>
    </div>
  );
}

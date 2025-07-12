"use client";

import React, { useEffect, useState } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";

interface MatchedPayload {
  roomId: string;
  partnerId: string;
  isOfferer: boolean;
}

export default function AnonymousChatRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isOfferer, setIsOfferer] = useState<boolean | null>(null);
  const socket = useSocket();

  // ✅ Initialize WebRTC only when roomId is available
  const { localStream, remoteStream } = useWebRTC(roomId, isOfferer, socket);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ Listen for 'matched' event from server
   * Sets roomId & isOfferer only after server assigns it
   * Emits join-room after receiving assigned roomId
   */
  useEffect(() => {
  if (!socket) return;

  const handleMatched = ({ roomId, partnerId }: MatchedPayload) => {
    console.log("🎉 Matched in room:", roomId);
    setRoomId(roomId);

    if (socket.id && partnerId) {
      const amIOfferer = socket.id < partnerId;
      setIsOfferer(amIOfferer);
      console.log("✅ I am offerer:", amIOfferer);
    } else {
      console.warn("⚠️ socket.id or partnerId missing, defaulting to not offerer");
      setIsOfferer(false);
    }

    // ✅ Join the assigned room after server matching
    socket.emit("join-room", roomId);
  };

  socket.on("matched", handleMatched);

  return () => {
    socket.off("matched", handleMatched);
  };
}, [socket]);


  /**
   * ✅ Update loading state when remote stream arrives
   */
  useEffect(() => {
    if (remoteStream) {
      setLoading(false);
    }
  }, [remoteStream]);

  /**
   * ✅ Leave room on unmount for cleanup
   */
  useEffect(() => {
    return () => {
      if (socket && roomId) {
        socket.emit("leave-room", roomId);
        console.log("👋 Left room:", roomId);
      }
    };
  }, [socket, roomId]);

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Video section */}
      <div className="flex-1 bg-black flex items-center justify-center relative">
        {loading ? (
          <FindingPartner />
        ) : (
          <>
            <div className="absolute bottom-4 right-4 w-40 h-40 border-2 border-white rounded-md overflow-hidden">
              <LocalVideo stream={localStream} />
            </div>
            <RemoteVideo stream={remoteStream} />
          </>
        )}
      </div>

      {/* Chat section */}
      <div className="md:w-1/3 bg-neutral-100 dark:bg-neutral-800 border-l border-neutral-300 dark:border-neutral-700 flex flex-col">
        {roomId && <ChatBox socket={socket} roomId={roomId} />}
      </div>
    </div>
  );
}

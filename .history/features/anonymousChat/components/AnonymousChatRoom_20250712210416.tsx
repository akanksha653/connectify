"use client";

import React, { useEffect, useState, useCallback } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";

export default function AnonymousChatRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isOfferer, setIsOfferer] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const socket = useSocket();
  const { localStream, remoteStream } = useWebRTC(roomId, isOfferer, sessionStarted);

  const handleMatched = useCallback(({ roomId, isOfferer }: { roomId: string; partnerId: string; isOfferer: boolean }) => {
    console.log("🎉 Matched in room:", roomId, "Offerer:", isOfferer);
    setRoomId(roomId);
    setIsOfferer(isOfferer);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.off("matched", handleMatched);
    socket.on("matched", handleMatched);
    return () => {
      socket.off("matched", handleMatched);
    };
  }, [socket, handleMatched]);

  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      console.log("⚠️ Disconnected from socket server");
      setLoading(false);
      setSessionStarted(false);
    };

    const handleConnect = () => {
      console.log("✅ Connected to socket server:", socket.id);
    };

    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
    };
  }, [socket]);

  useEffect(() => {
    return () => {
      if (socket && roomId) {
        socket.emit("leave-room", roomId);
        console.log("👋 Left room:", roomId);
      }
    };
  }, [socket, roomId]);

  // 🔁 Control functions passed into ChatBox
  const handleStart = () => {
    if (!sessionStarted) {
      setLoading(true);
      setSessionStarted(true);
      socket?.emit("start-looking");
      console.log("🔎 Started looking for partner");
    }
  };

  const handleStop = () => {
    if (roomId) {
      socket?.emit("leave-room", roomId);
      console.log("🛑 Stopped session and left room:", roomId);
    }
    setRoomId(null);
    setIsOfferer(null);
    setSessionStarted(false);
    setLoading(false);
  };

  const handleSkip = () => {
    handleStop();
    handleStart();
    console.log("⏭️ Skipped to new partner");
  };

  return (
    <div className="grid md:grid-cols-3 h-screen bg-neutral-100 dark:bg-neutral-900">
      {/* Video Section */}
      <div className="md:col-span-2 relative flex items-center justify-center bg-black">
        {!sessionStarted ? (
          <div className="text-white text-xl font-semibold">Click Start to begin searching</div>
        ) : loading ? (
          <FindingPartner />
        ) : (
          <>
            <RemoteVideo stream={remoteStream} />
            <div className="absolute bottom-5 right-5 w-36 h-36 border-2 border-white rounded overflow-hidden">
              {localStream ? (
                <LocalVideo stream={localStream} />
              ) : (
                <div className="text-white text-sm p-2">Loading camera...</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chat + Controls */}
      <div className="flex flex-col border-l border-neutral-300 dark:border-neutral-700">
        <div className="flex-grow overflow-y-auto">
          {roomId ? (
            <ChatBox
              socket={socket}
              roomId={roomId}
              onStart={handleStart}
              onStop={handleStop}
              onSkip={handleSkip}
              sessionStarted={sessionStarted}
              loading={loading}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400 text-sm px-4">
              You’ll be able to chat once you’re matched.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

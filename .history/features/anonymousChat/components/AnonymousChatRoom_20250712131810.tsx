"use client";

import React, { useEffect, useState, useCallback } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";
import Button from "../../../components/common/Button";

export default function AnonymousChatRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isOfferer, setIsOfferer] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);

  const socket = useSocket();

  // ✅ Initialize WebRTC only when roomId & isOfferer are assigned
  const { localStream, remoteStream, stopWebRTC } = useWebRTC(roomId, isOfferer);

  /**
   * ✅ Handle 'matched' event from server
   */
  const handleMatched = useCallback(
    ({
      roomId,
      partnerId,
      isOfferer,
    }: {
      roomId: string;
      partnerId: string;
      isOfferer: boolean;
    }) => {
      console.log("🎉 Matched in room:", roomId, "Offerer:", isOfferer);
      setRoomId(roomId);
      setIsOfferer(isOfferer);
      setLoading(false);

      // ✅ Join assigned room after server matching
      socket?.emit("join-room", roomId);
    },
    [socket]
  );

  /**
   * ✅ Register matched event listener
   */
  useEffect(() => {
    if (!socket) return;

    socket.off("matched", handleMatched); // Prevent duplicate listeners
    socket.on("matched", handleMatched);

    return () => {
      socket.off("matched", handleMatched);
    };
  }, [socket, handleMatched]);

  /**
   * ✅ Listen for socket connect/disconnect
   */
  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      console.log("⚠️ Disconnected from socket server");
      setLoading(true);
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

  /**
   * ✅ Update loading state when remote stream arrives
   */
  useEffect(() => {
    if (remoteStream) {
      setLoading(false);
    }
  }, [remoteStream]);

  /**
   * ✅ Leave room on unmount
   */
  useEffect(() => {
    return () => {
      if (socket && roomId) {
        socket.emit("leave-room", roomId);
        console.log("👋 Left room:", roomId);
        stopWebRTC();
      }
    };
  }, [socket, roomId, stopWebRTC]);

  /**
   * ✅ Start chat handler
   */
  const handleStart = () => {
    setLoading(true);
    setChatStarted(true);
    socket?.emit("find-partner");
    console.log("🔍 Looking for partner...");
  };

  /**
   * ✅ Stop chat handler
   */
  const handleStop = () => {
    if (roomId) {
      socket?.emit("leave-room", roomId);
      console.log("🛑 Stopped chat, left room:", roomId);
    }
    stopWebRTC();
    setRoomId(null);
    setIsOfferer(null);
    setChatStarted(false);
    setLoading(false);
  };

  /**
   * ✅ Skip partner handler
   */
  const handleSkip = () => {
    console.log("⏭️ Skipping to next partner...");
    handleStop(); // Leave current room & cleanup
    handleStart(); // Find next partner
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Video Section */}
      <div className="flex-1 bg-black flex items-center justify-center relative">
        {!chatStarted ? (
          <Button label="Start" onClick={handleStart} />
        ) : loading ? (
          <FindingPartner />
        ) : (
          <>
            <div className="absolute top-4 left-4 flex gap-2">
              <Button label="Stop" onClick={handleStop} className="bg-red-600 hover:bg-red-700" />
              <Button label="Skip" onClick={handleSkip} className="bg-yellow-600 hover:bg-yellow-700" />
            </div>
            <div className="absolute bottom-4 right-4 w-40 h-40 border-2 border-white rounded-md overflow-hidden">
              {localStream ? (
                <LocalVideo stream={localStream} />
              ) : (
                <div className="text-white text-sm">Loading camera...</div>
              )}
            </div>
            <RemoteVideo stream={remoteStream} />
          </>
        )}
      </div>

      {/* Chat Section */}
      <div className="md:w-1/3 bg-neutral-100 dark:bg-neutral-800 border-l border-neutral-300 dark:border-neutral-700 flex flex-col">
        {roomId && <ChatBox socket={socket} roomId={roomId} />}
      </div>
    </div>
  );
}

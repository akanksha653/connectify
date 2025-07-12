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

  /**
   * ✅ Initialize WebRTC only when session starts
   */
  const { localStream, remoteStream } = useWebRTC(roomId, isOfferer, sessionStarted);

  /**
   * ✅ Handle 'matched' event from server
   */
  const handleMatched = useCallback(
    ({ roomId, isOfferer }: { roomId: string; partnerId: string; isOfferer: boolean }) => {
      console.log("🎉 Matched in room:", roomId, "Offerer:", isOfferer);
      setRoomId(roomId);
      setIsOfferer(isOfferer);
      setLoading(false);
    },
    []
  );

  /**
   * ✅ Register matched event listener
   */
  useEffect(() => {
    if (!socket) return;

    socket.off("matched", handleMatched);
    socket.on("matched", handleMatched);

    return () => {
      socket.off("matched", handleMatched);
    };
  }, [socket, handleMatched]);

  /**
   * ✅ Socket connect/disconnect handlers
   */
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

  /**
   * ✅ Leave room on unmount
   */
  useEffect(() => {
    return () => {
      if (socket && roomId) {
        socket.emit("leave-room", roomId);
        console.log("👋 Left room:", roomId);
      }
    };
  }, [socket, roomId]);

  /**
   * 🔘 Start, Stop, and Skip Handlers
   */
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

  /**
   * ✅ Dynamic Button Label
   */
  const renderControlButton = () => {
    if (!sessionStarted) {
      return (
        <button
          onClick={handleStart}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition duration-200"
        >
          Start
        </button>
      );
    } else if (loading) {
      return (
        <button
          onClick={handleStop}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition duration-200"
        >
          Stop
        </button>
      );
    } else {
      return (
        <button
          onClick={handleSkip}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-4 py-2 rounded-lg shadow transition duration-200"
        >
          Skip
        </button>
      );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Video Section */}
      <div className="flex-1 bg-black flex items-center justify-center relative">
        {!sessionStarted ? (
          <div className="text-white text-xl font-semibold">Click Start to begin searching</div>
        ) : loading ? (
          <FindingPartner />
        ) : (
          <>
            <RemoteVideo stream={remoteStream} />
            <div className="absolute bottom-4 right-4 w-40 h-40 border-2 border-white rounded-md overflow-hidden shadow-lg">
              {localStream ? (
                <LocalVideo stream={localStream} />
              ) : (
                <div className="text-white text-sm">Loading camera...</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chat Section */}
      <div className="md:w-1/3 bg-neutral-100 dark:bg-neutral-800 border-l border-neutral-300 dark:border-neutral-700 flex flex-col">
        <div className="flex-grow">
          {roomId && <ChatBox socket={socket} roomId={roomId} />}
        </div>

        {/* Dynamic Start/Stop/Skip Button */}
        <div className="p-4 border-t border-neutral-300 dark:border-neutral-700 flex justify-end">
          {renderControlButton()}
        </div>
      </div>
    </div>
  );
}

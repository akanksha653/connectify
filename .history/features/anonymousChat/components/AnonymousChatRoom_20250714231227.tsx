"use client";

import React, { useEffect, useState, useCallback } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";
import { Users, RefreshCcw, CircleStop } from "lucide-react";

export default function AnonymousChatRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isOfferer, setIsOfferer] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [lastAction, setLastAction] = useState<"skipped" | "left" | null>(null);

  const socket = useSocket();
  const { localStream, remoteStream } = useWebRTC(roomId, isOfferer, sessionStarted);

  const handleMatched = useCallback(
    ({ roomId, isOfferer }: { roomId: string; partnerId: string; isOfferer: boolean }) => {
      console.log("🎉 Matched in room:", roomId, "Offerer:", isOfferer);
      setRoomId(roomId);
      setIsOfferer(isOfferer);
      setLoading(false);
      setLastAction(null);
    },
    []
  );

  const handlePartnerLeft = useCallback(() => {
    console.log("👋 Partner left the chat");
    setRoomId(null);
    setIsOfferer(null);
    setSessionStarted(false);
    setLoading(false);
    setLastAction("left");
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.off("matched", handleMatched);
    socket.on("matched", handleMatched);
    socket.on("partner-left", handlePartnerLeft);
    return () => {
      socket.off("matched", handleMatched);
      socket.off("partner-left", handlePartnerLeft);
    };
  }, [socket, handleMatched, handlePartnerLeft]);

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
    setLastAction("skipped");
    console.log("⏭️ Skipped to new partner");
  };

  const renderControlButton = () => {
    const baseClasses =
      "flex items-center gap-2 px-4 py-2 rounded-lg shadow font-medium transition whitespace-nowrap";
    if (!sessionStarted) {
      return (
        <button
          onClick={handleStart}
          className={`${baseClasses} bg-green-600 hover:bg-green-700 text-white`}
        >
          <Users className="w-5 h-5" />
          Start
        </button>
      );
    } else if (loading) {
      return (
        <button
          onClick={handleStop}
          className={`${baseClasses} bg-red-600 hover:bg-red-700 text-white`}
        >
          <CircleStop className="w-5 h-5" />
          Stop
        </button>
      );
    } else {
      return (
        <button
          onClick={handleSkip}
          className={`${baseClasses} bg-yellow-500 hover:bg-yellow-600 text-white`}
        >
          <RefreshCcw className="w-5 h-5" />
          Skip
        </button>
      );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-neutral-100 dark:bg-neutral-900">
      {/* Video Section */}
      <div className="flex-1 relative bg-black flex items-center justify-center p-2 md:p-4">
        {!sessionStarted ? (
          <div className="text-white text-xl font-semibold text-center px-4">
            Click Start to begin searching
          </div>
        ) : loading ? (
          <FindingPartner />
        ) : (
          <>
            <RemoteVideo stream={remoteStream} />
            <div className="absolute top-4 right-4 w-36 h-36 md:w-48 md:h-48 rounded overflow-hidden border-2 border-white shadow-lg z-20">
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
      <div className="w-full md:w-[420px] flex flex-col border-t md:border-t-0 md:border-l border-neutral-300 dark:border-neutral-700">
        <div className="flex-grow overflow-hidden">
          {roomId ? (
            <ChatBox socket={socket} roomId={roomId} />
          ) : lastAction === "skipped" ? (
            <div className="flex items-center justify-center h-full text-neutral-500 dark:text-neutral-400 text-sm px-4 text-center">
              You skipped the chat. Click Start for a new partner...
            </div>
          ) : lastAction === "left" ? (
            <div className="flex items-center justify-center h-full text-neutral-500 dark:text-neutral-400 text-sm px-4 text-center">
              Your partner left the chat. Click Start to begin again.
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400 text-sm px-4 text-center">
              You’ll be able to chat once you’re matched.
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="p-3 border-t border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex justify-end">
          {renderControlButton()}
        </div>
      </div>
    </div>
  );
}

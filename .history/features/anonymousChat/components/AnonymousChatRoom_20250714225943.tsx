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
  const [lastAction, setLastAction] = useState<"skipped" | null>(null);

  const socket = useSocket();
  const { localStream, remoteStream } = useWebRTC(roomId, isOfferer, sessionStarted);

  const handleMatched = useCallback(
    ({ roomId, isOfferer }: { roomId: string; partnerId: string; isOfferer: boolean }) => {
      setRoomId(roomId);
      setIsOfferer(isOfferer);
      setLoading(false);
      setLastAction(null);
    },
    []
  );

  useEffect(() => {
    if (!socket) return;
    socket.off("matched", handleMatched);
    socket.on("matched", handleMatched);
    return () => socket.off("matched", handleMatched);
  }, [socket, handleMatched]);

  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      setLoading(false);
      setSessionStarted(false);
    };

    const handleConnect = () => {
      console.log("✅ Connected to socket:", socket.id);
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
      }
    };
  }, [socket, roomId]);

  const handleStart = () => {
    if (!sessionStarted) {
      setLoading(true);
      setSessionStarted(true);
      socket?.emit("start-looking");
    }
  };

  const handleStop = () => {
    if (roomId) {
      socket?.emit("leave-room", roomId);
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
  };

  const renderControlButton = () => {
    const base =
      "flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow transition whitespace-nowrap";

    if (!sessionStarted) {
      return (
        <button onClick={handleStart} className={`${base} bg-green-600 hover:bg-green-700 text-white`}>
          <Users className="w-5 h-5" />
          Start
        </button>
      );
    } else if (loading) {
      return (
        <button onClick={handleStop} className={`${base} bg-red-600 hover:bg-red-700 text-white`}>
          <CircleStop className="w-5 h-5" />
          Stop
        </button>
      );
    } else {
      return (
        <button onClick={handleSkip} className={`${base} bg-yellow-500 hover:bg-yellow-600 text-white`}>
          <RefreshCcw className="w-5 h-5" />
          Skip
        </button>
      );
    }
  };

  return (
    <div className="flex flex-col md:grid md:grid-cols-3 h-screen bg-neutral-100 dark:bg-neutral-900">
      {/* Video Section */}
      <div className="md:col-span-2 relative bg-black flex items-center justify-center p-2 md:p-4 overflow-hidden">
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
      <div className="flex flex-col h-full border-t md:border-t-0 md:border-l border-neutral-300 dark:border-neutral-700">
        <div className="flex-grow overflow-hidden">
          {roomId ? (
            <ChatBox socket={socket} roomId={roomId} />
          ) : lastAction === "skipped" ? (
            <div className="flex items-center justify-center h-full text-neutral-500 dark:text-neutral-400 text-sm px-4 text-center">
              You skipped the chat. Click Start for a new partner...
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

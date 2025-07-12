import React, { useEffect, useState } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";

export default function AnonymousChatRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isOfferer, setIsOfferer] = useState<boolean>(false);
  const socket = useSocket();

  // ✅ Initialize WebRTC with isOfferer
  const { localStream, remoteStream } = useWebRTC(roomId, isOfferer);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;

    const handleMatched = ({ roomId, partnerId, isOfferer }: { roomId: string; partnerId: string; isOfferer: boolean }) => {
      console.log("🎉 Matched in room:", roomId);
      setRoomId(roomId);
      setIsOfferer(isOfferer);

      socket.emit("join-room", roomId);
    };

    socket.on("matched", handleMatched);

    return () => {
      socket.off("matched", handleMatched);
    };
  }, [socket]);

  useEffect(() => {
    if (remoteStream) {
      setLoading(false);
    }
  }, [remoteStream]);

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

      <div className="md:w-1/3 bg-neutral-100 dark:bg-neutral-800 border-l border-neutral-300 dark:border-neutral-700 flex flex-col">
        {roomId && <ChatBox socket={socket} roomId={roomId} />}
      </div>
    </div>
  );
}

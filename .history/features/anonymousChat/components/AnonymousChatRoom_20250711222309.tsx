"use client";

import React, { useEffect, useState } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";

export default function AnonymousChatRoom() {
  const roomId = "anonymous-room"; // TODO: Replace with dynamic room id generation
  const { localStream, remoteStream } = useWebRTC(roomId);
  const socket = useSocket();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (remoteStream) {
      setLoading(false);
    }
  }, [remoteStream]);

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
        {/* Pass roomId for accurate messaging */}
        <ChatBox socket={socket} roomId={roomId} />
      </div>
    </div>
  );
}

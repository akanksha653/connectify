"use client";

import React, { useEffect, useState } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";

export default function AnonymousChatRoom() {
  const { localStream, remoteStream, isConnected } = useWebRTC();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected) {
      setLoading(false);
    }
  }, [isConnected]);

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="flex-1 bg-black flex items-center justify-center">
        {loading ? (
          <FindingPartner />
        ) : (
          <>
            <LocalVideo stream={localStream} />
            <RemoteVideo stream={remoteStream} />
          </>
        )}
      </div>
      <div className="md:w-1/3 bg-neutral-100 dark:bg-neutral-800 border-l border-neutral-300 dark:border-neutral-700 flex flex-col">
        <ChatBox socket={socket} />
      </div>
    </div>
  );
}

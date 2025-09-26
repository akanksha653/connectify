"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import LocalVideo from "../../../../features/RoomChat/components/LocalVideo";
import RemoteVideo from "../../../../features/RoomChat/components/RemoteVideo";
import ChatBox from "../../../../features/RoomChat/components/ChatBox";

const SOCKET_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

interface RoomInfo {
  id: string;
  name: string;
  topic: string;
  description?: string;
  users: string[];
}

interface UserInfo {
  name: string;
  age: string;
  gender: string;
  country: string;
}

export default function RoomPage() {
  const { id } = useParams() as { id: string };
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [peers, setPeers] = useState<{ [peerId: string]: MediaStream }>({});

  const peerConnections = useRef<{ [peerId: string]: RTCPeerConnection }>({});

  const userInfo: UserInfo = JSON.parse(localStorage.getItem("user-info") || "{}");

  // Start local camera & mic
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        // Force re-render
        setPeers((prev) => ({ ...prev }));
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();
  }, []);

  // Connect to room & handle WebRTC
  useEffect(() => {
    if (!localStreamRef.current) return;

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // Join room
    socket.emit("join-room-dynamic", { roomId: id, userInfo });

    socket.on("room-update", (data: RoomInfo) => setRoom(data));

    socket.on("user-joined", async ({ userId, userName }: { userId: string; userName: string }) => {
      if (!localStreamRef.current) return;

      const pc = createPeerConnection(userId, userName);
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("room-offer", { roomId: id, offer, to: userId });
    });

    socket.on(
      "room-offer",
      async ({ from, offer, name }: { from: string; offer: RTCSessionDescriptionInit; name: string }) => {
        if (!localStreamRef.current) return;
        const pc = createPeerConnection(from, name);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("room-answer", { roomId: id, answer, to: from });
      }
    );

    socket.on("room-answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current[from]?.pc;
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("room-ice", ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current[from]?.pc;
      if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("user-left", ({ userId }: { userId: string }) => {
      const pcData = peerConnections.current[userId];
      if (pcData) pcData.pc.close();
      delete peerConnections.current[userId];
      setPeers((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    });

    return () => {
      socket.emit("leave-room", { roomId: id });
      socket.disconnect();
      Object.values(peerConnections.current).forEach((p) => p.pc.close());
      peerConnections.current = {};
    };
  }, [id, userInfo]);

  const createPeerConnection = (peerId: string, name: string) => {
    const socket = socketRef.current!;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("room-ice", { roomId: id, candidate: e.candidate, to: peerId });
    };

    pc.ontrack = (e) =>
      setPeers((prev) => ({
        ...prev,
        [peerId]: e.streams[0],
      }));

    peerConnections.current[peerId] = { pc, name };
    return pc;
  };

  if (!localStreamRef.current) return <p>Loading camera...</p>;

  const totalUsers = Object.keys(peers).length + 1;
  const getGridCols = () => {
    if (totalUsers <= 1) return "grid-cols-1";
    if (totalUsers === 2) return "grid-cols-2";
    if (totalUsers <= 4) return "grid-cols-2 md:grid-cols-2";
    if (totalUsers <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="p-4 space-y-4">
      {/* Room info */}
      {room && (
        <div className="bg-gray-100 p-4 rounded-lg shadow">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-sm text-gray-700">{room.topic}</p>
          <p className="text-sm text-gray-500">{room.description}</p>
          <p className="mt-2 text-sm font-medium">Users: {room.users.length}</p>
        </div>
      )}

      {/* Video Grid */}
      <div className={`grid ${getGridCols()} gap-4`}>
        <LocalVideo stream={localStreamRef.current} label={userInfo.name} />
        {Object.entries(peers).map(([peerId, stream]) => {
          const name = peerConnections.current[peerId]?.name || peerId;
          return <RemoteVideo key={peerId} stream={stream} label={name} />;
        })}
      </div>

      {/* Chat */}
      {socketRef.current && <ChatBox socket={socketRef.current} roomId={id} userName={userInfo.name} />}
    </div>
  );
}

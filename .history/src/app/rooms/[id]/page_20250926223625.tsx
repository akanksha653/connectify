"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import LocalVideo from "../../../../features/RoomChat/components/LocalVideo";
import RemoteVideo from "../../../../features/RoomChat/components/RemoteVideo";
import ChatBox from "../../../../features/RoomChat/components/ChatBox";

const SOCKET_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

interface UserInfo {
  name: string;
  age: string;
  gender: string;
  country: string;
}

interface RoomUser {
  id: string;
  userInfo: UserInfo;
}

interface RoomInfo {
  id: string;
  name: string;
  topic: string;
  description?: string;
  users: RoomUser[];
}

export default function RoomPage() {
  const { id } = useParams() as { id: string };
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [peers, setPeers] = useState<{ [peerId: string]: MediaStream }>({});

  const peerConnections = useRef<{ [peerId: string]: { pc: RTCPeerConnection; name: string } }>({});

  const userInfo: UserInfo = JSON.parse(localStorage.getItem("user-info") || "{}");

  // Start local camera & mic
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setPeers((prev) => ({ ...prev })); // force re-render
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();
  }, []);

  // Connect to socket & handle WebRTC
  useEffect(() => {
    if (!localStreamRef.current) return;

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // Join room
    socket.emit("join-room-dynamic", { roomId: id, userInfo });

    // Room update
    socket.on("room-update", async (data: RoomInfo) => {
      if (!data?.users) return;
      setRoom(data);

      for (const user of data.users) {
        if (user.id === socket.id) continue;
        if (!peerConnections.current[user.id]) {
          await createOfferToPeer(user.id, user.userInfo.name);
        }
      }
    });

    // Offer received
    socket.on(
      "room-offer",
      async ({ from, offer, name }: { from: string; offer: RTCSessionDescriptionInit; name: string }) => {
        if (!localStreamRef.current) return;

        const pc = createPeerConnection(from, name);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("room-answer", { roomId: id, answer, to: from });
      }
    );

    // Answer received
    socket.on("room-answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current[from]?.pc;
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ICE candidate
    socket.on("room-ice", ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current[from]?.pc;
      if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // User left
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
    if (peerConnections.current[peerId]) return peerConnections.current[peerId].pc;

    const socket = socketRef.current!;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("room-ice", { roomId: id, candidate: e.candidate, to: peerId });
    };

    pc.ontrack = (e) => {
      if (!e.streams[0]) return;
      setPeers((prev) => ({ ...prev, [peerId]: e.streams[0] }));
    };

    peerConnections.current[peerId] = { pc, name };
    return pc;
  };

  const createOfferToPeer = async (peerId: string, name: string) => {
    if (!localStreamRef.current || peerConnections.current[peerId]) return;

    const pc = createPeerConnection(peerId, name);
    localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current?.emit("room-offer", { roomId: id, offer, to: peerId });
  };

  if (!localStreamRef.current) return <p>Loading camera...</p>;

  const totalUsers = Object.keys(peers).length + 1;
  const getGridCols = () => {
    if (totalUsers === 1) return "grid-cols-1";
    if (totalUsers === 2) return "grid-cols-2";
    if (totalUsers <= 4) return "grid-cols-2 md:grid-cols-2";
    if (totalUsers <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 min-h-screen">
      <div className={`flex-1 grid ${getGridCols()} gap-4`}>
        <LocalVideo stream={localStreamRef.current} label={userInfo.name || "You"} />
        {Object.entries(peers).map(([peerId, stream]) => {
          const name = peerConnections.current[peerId]?.name || "Stranger";
          if (!stream) return null;
          return <RemoteVideo key={peerId} stream={stream} label={name} />;
        })}
      </div>

      <div className="md:w-80 flex-shrink-0">
        {socketRef.current && <ChatBox socket={socketRef.current} roomId={id} userName={userInfo.name || "You"} />}
      </div>

      {room && (
        <div className="md:w-64 p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg shadow flex-shrink-0">
          <h2 className="text-lg font-bold">{room.name || "Room"}</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">{room.topic}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{room.description}</p>
          <p className="mt-2 text-sm font-medium">Users: {room.users.length}</p>
        </div>
      )}
    </div>
  );
}

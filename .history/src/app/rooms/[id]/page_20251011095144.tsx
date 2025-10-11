"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import LocalVideo from "../../../../features/RoomChat/components/LocalVideo";
import RemoteVideo from "../../../../features/RoomChat/components/RemoteVideo";
import ChatBox from "../../../../features/RoomChat/components/ChatBox";
import { connectRoomSocket, disconnectRoomSocket } from "../../../../features/RoomChat/services/roomSocketService";

interface UserInfo {
  name: string;
  age: string;
  gender: string;
  country: string;
}

interface RoomUser {
  socketId: string;
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
  const socketRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<{ [peerId: string]: { pc: RTCPeerConnection; name: string } }>({});
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [peers, setPeers] = useState<{ [peerId: string]: MediaStream }>({});

  const userInfo: UserInfo = JSON.parse(localStorage.getItem("user-info") || "{}");

  // Start camera & mic
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setPeers((prev) => ({ ...prev })); // force render
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();
  }, []);

  // Connect to /rooms socket and handle WebRTC
  useEffect(() => {
    if (!localStreamRef.current) return;

    const socket = connectRoomSocket();
    socketRef.current = socket;

    // Join room
    socket.emit("join-room", { roomId: id, user: userInfo });

    // Room update
    socket.on("user-joined", (user: RoomUser) => {
      if (user.socketId === socket.id) return;
      createOfferToPeer(user.socketId, user.userInfo.name);
    });

    // Receive offer
    socket.on("room-offer", async ({ from, offer, name }) => {
      if (!localStreamRef.current) return;
      const pc = createPeerConnection(from, name);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("room-answer", { roomId: id, answer, to: from });
    });

    // Receive answer
    socket.on("room-answer", async ({ from, answer }) => {
      const pc = peerConnections.current[from]?.pc;
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Receive ICE
    socket.on("room-ice", ({ from, candidate }) => {
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
      socket.emit("leave-room", { roomId: id, userId: socket.id });
      Object.values(peerConnections.current).forEach((p) => p.pc.close());
      peerConnections.current = {};
      disconnectRoomSocket();
    };
  }, [id, userInfo]);

  const createPeerConnection = (peerId: string, name: string) => {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId].pc;

    const socket = socketRef.current;
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

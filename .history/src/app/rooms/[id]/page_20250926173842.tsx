"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import io, { Socket } from "socket.io-client";

// ⚡️ Adjust to your signaling server endpoint
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface RoomInfo {
  id: string;
  name: string;
  topic: string;
  description: string;
  users: string[];
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
}

export default function RoomPage() {
  const { id } = useParams() as { id: string };
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [peers, setPeers] = useState<{ [peerId: string]: MediaStream }>({});

  // 🟢 Join Room on mount
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.emit("join-room", { roomId: id });

    // ✅ Room info updates
    socket.on("room-update", (data: RoomInfo) => setRoom(data));

    // ✅ Chat messages
    socket.on("room-message", (msg: ChatMessage) =>
      setMessages((prev) => [...prev, msg])
    );

    // ✅ New user joins (start WebRTC)
    socket.on("user-joined", async ({ userId }: { userId: string }) => {
      if (!localVideoRef.current) return;

      const pc = createPeerConnection(socket, userId);

      // Add local stream to connection
      if (localVideoRef.current.srcObject) {
        (localVideoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => pc.addTrack(track));
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("room-offer", { roomId: id, offer, to: userId });
    });

    // ✅ Handle incoming offer
    socket.on(
      "room-offer",
      async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
        const pc = createPeerConnection(socket, from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        if (localVideoRef.current?.srcObject) {
          (localVideoRef.current.srcObject as MediaStream)
            .getTracks()
            .forEach((track) => pc.addTrack(track));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("room-answer", { roomId: id, answer, to: from });
      }
    );

    // ✅ Handle answer
    socket.on(
      "room-answer",
      async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
        const pc = peerConnections[from];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    );

    // ✅ Handle ICE candidates
    socket.on(
      "room-ice",
      ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        const pc = peerConnections[from];
        if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    );

    // ✅ User left
    socket.on("user-left", ({ userId }: { userId: string }) => {
      const pc = peerConnections[userId];
      if (pc) pc.close();
      delete peerConnections[userId];
      setPeers((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    });

    // 🔴 Leave room on unmount
    return () => {
      socket.emit("leave-room", { roomId: id });
      socket.disconnect();
      Object.values(peerConnections).forEach((pc) => pc.close());
    };
  }, [id]);

  // 🎥 Start local camera
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error", err);
      }
    })();
  }, []);

  // 💬 Send chat message
  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("room-message", {
      roomId: id,
      text: input.trim(),
    });
    setInput("");
  };

  // ======= WebRTC Helper =======
  const peerConnections: { [peerId: string]: RTCPeerConnection } = {};
  const createPeerConnection = (socket: Socket, peerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("room-ice", {
          roomId: id,
          candidate: e.candidate,
          to: peerId,
        });
      }
    };

    pc.ontrack = (e) => {
      setPeers((prev) => ({ ...prev, [peerId]: e.streams[0] }));
    };

    peerConnections[peerId] = pc;
    return pc;
  };

  return (
    <div className="p-4 space-y-4">
      {room ? (
        <div className="bg-gray-100 p-4 rounded-lg shadow">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-sm text-gray-700">{room.topic}</p>
          <p className="text-sm text-gray-500">{room.description}</p>
          <p className="mt-2 text-sm font-medium">
            Users in Room: {room.users.length}
          </p>
        </div>
      ) : (
        <p>Loading room...</p>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-48 bg-black rounded-lg"
        />
        {Object.entries(peers).map(([peerId, stream]) => (
          <RemoteVideo key={peerId} stream={stream} />
        ))}
      </div>

      {/* Chat */}
      <div className="bg-white p-4 rounded-lg shadow max-w-lg">
        <div className="h-48 overflow-y-auto mb-2 border p-2">
          {messages.map((m) => (
            <p key={m.id}>
              <strong>{m.user}:</strong> {m.text}
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border p-2 rounded"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ Component for remote streams
function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className="w-full h-48 bg-black rounded-lg"
    />
  );
}

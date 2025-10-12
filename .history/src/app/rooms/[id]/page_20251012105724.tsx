"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import VideoGrid from "../../../../features/RoomChat/components/VideoGrid";
import ChatBox from "../../../../features/RoomChat/components/RoomChatBox";
import { connectRoomSocket, disconnectRoomSocket } from "../../../../features/RoomChat/services/roomSocketService";

interface UserInfo {
  name?: string;
  age?: string;
  gender?: string;
  country?: string;
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
  const router = useRouter();

  const socketRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Record<string, { pc: RTCPeerConnection; name?: string }>>({});

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState<Record<string, boolean>>({});

  const userInfo: UserInfo = JSON.parse(localStorage.getItem("user-info") || "{}");

  // -----------------------------
  // 🎥 Start local camera & mic
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return stream.getTracks().forEach((t) => t.stop());

        localStreamRef.current = stream;

        // Local speaking detection
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const detectSpeaking = () => {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          setSpeakingPeers((prev) => ({ ...prev, local: sum > 2000 }));
          requestAnimationFrame(detectSpeaking);
        };
        detectSpeaking();
      } catch (err) {
        console.error("🎥 Camera error:", err);
      }
    })();

    return () => {
      mounted = false;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // -----------------------------
  // 🔗 Create Peer Connection
  // -----------------------------
  const createPeerConnection = (peerId: string, name?: string) => {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId].pc;
    const socket = socketRef.current;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    // Add local tracks
    localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));

    // ICE Candidate
    pc.onicecandidate = (e) => {
      if (e.candidate) socket?.emit("room-ice", { roomId: id, candidate: e.candidate, to: peerId });
    };

    // Remote Stream
    pc.ontrack = (e) => {
      if (!e.streams[0]) return;
      setPeers((prev) => ({ ...prev, [peerId]: e.streams[0] }));

      // Remote speaking detection
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(e.streams[0]);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const detectRemoteSpeaking = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        setSpeakingPeers((prev) => ({ ...prev, [peerId]: sum > 2000 }));
        requestAnimationFrame(detectRemoteSpeaking);
      };
      detectRemoteSpeaking();
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) removePeer(peerId);
    };

    peerConnections.current[peerId] = { pc, name };
    return pc;
  };

  const removePeer = (peerId: string) => {
    peerConnections.current[peerId]?.pc.close();
    delete peerConnections.current[peerId];
    setPeers((prev) => { const copy = { ...prev }; delete copy[peerId]; return copy; });
    setSpeakingPeers((prev) => { const copy = { ...prev }; delete copy[peerId]; return copy; });
  };

  const cleanupAllPeers = () => {
    Object.keys(peerConnections.current).forEach((pid) => peerConnections.current[pid].pc.close());
    peerConnections.current = {};
    setPeers({});
    setSpeakingPeers({});
  };

  // -----------------------------
  // 🔥 Socket.io Setup
  // -----------------------------
  useEffect(() => {
    if (!id) return;
    let active = true;

    const socket = connectRoomSocket();
    socketRef.current = socket;
    socket.emit("join-room", { roomId: id, user: userInfo });

    // Room users update
    socket.on("room-users", (users: RoomUser[]) => {
      if (!active) return;
      setRoom((prev) => ({ ...(prev || {}), users }) as RoomInfo);
      users.forEach((u) => {
        if (u.socketId !== socket.id) setTimeout(() => createOfferToPeer(u.socketId, u.userInfo?.name), 80);
      });
    });

    // User joined
    socket.on("user-joined", (payload: RoomUser) => {
      if (!active || !payload.socketId) return;
      setRoom((prev) => {
        const copy = prev ? { ...prev } : { id, name: "", topic: "", users: [] } as RoomInfo;
        copy.users = copy.users
          ? [...copy.users.filter((x) => x.socketId !== payload.socketId), payload]
          : [payload];
        return copy;
      });
      if (payload.socketId !== socket.id) setTimeout(() => createOfferToPeer(payload.socketId, payload.userInfo?.name), 80);
    });

    // WebRTC signaling
    socket.on("room-offer", async ({ from, offer }) => {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("room-answer", { roomId: id, answer, to: from });
    });

    socket.on("room-answer", async ({ from, answer }) => {
      const pc = peerConnections.current[from]?.pc;
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("room-ice", ({ from, candidate }) => {
      const pc = peerConnections.current[from]?.pc;
      if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });

    socket.on("user-left", ({ userId }) => {
      removePeer(userId);
      setRoom((prev) => prev ? { ...prev, users: prev.users.filter((u) => u.socketId !== userId) } : prev);
    });

    return () => {
      active = false;
      try { socket.emit("leave-room", { roomId: id, userId: socket.id }); } catch {}
      cleanupAllPeers();
      disconnectRoomSocket();
      socketRef.current = null;
    };
  }, [id]);

  // -----------------------------
  // 🧠 Peer Offer Creation
  // -----------------------------
  const createOfferToPeer = async (peerId: string, name?: string) => {
    if (!localStreamRef.current || peerConnections.current[peerId]) return;
    const pc = createPeerConnection(peerId, name);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit("room-offer", { roomId: id, offer, to: peerId });
  };

  // -----------------------------
  // 🎛 UI Actions
  // -----------------------------
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const newMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = !newMuted));
    setMuted(newMuted);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const newOff = !cameraOff;
    localStreamRef.current.getVideoTracks().forEach((track) => (track.enabled = !newOff));
    setCameraOff(newOff);
  };

  const leaveRoom = () => {
    cleanupAllPeers();
    disconnectRoomSocket();
    router.push("/rooms");
  };

  // -----------------------------
  // Render
  // -----------------------------
  if (!localStreamRef.current) return <p>Loading camera...</p>;

  const userStreams = [
    { id: "local", stream: localStreamRef.current, name: userInfo?.name || "You", isSpeaking: speakingPeers["local"] },
    ...Object.entries(peers).map(([id, stream]) => ({
      id,
      stream,
      name: peerConnections.current[id]?.name || "Stranger",
      isSpeaking: speakingPeers[id],
    })),
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 min-h-screen">
      {/* Video Grid */}
      <div className="flex-1">
        <VideoGrid localStream={localStreamRef.current} localName={userInfo?.name || "You"} remoteStreams={userStreams.filter((u) => u.id !== "local")} />
        <div className="flex gap-2 mt-2 justify-end">
          <button className="bg-white dark:bg-gray-700 p-2 rounded" onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>
          <button className="bg-white dark:bg-gray-700 p-2 rounded" onClick={toggleCamera}>{cameraOff ? "Camera On" : "Camera Off"}</button>
          <button className="bg-red-500 text-white p-2 rounded" onClick={leaveRoom}>Leave</button>
        </div>
      </div>

      {/* Chat Box */}
      <div className="md:w-80 flex-shrink-0">
        {socketRef.current && <ChatBox socket={socketRef.current} roomId={id} userName={userInfo?.name || "You"} />}
      </div>

      {/* Room Info */}
      {room && (
        <div className="md:w-64 p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg shadow flex-shrink-0">
          <h2 className="text-lg font-bold">{room.name}</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">{room.topic}</p>
          {room.description && <p className="text-sm text-gray-500 dark:text-gray-400">{room.description}</p>}
          <p className="mt-2 text-sm font-medium">Users: {room.users?.length ?? Object.keys(peers).length + 1}</p>
        </div>
      )}
    </div>
  );
}

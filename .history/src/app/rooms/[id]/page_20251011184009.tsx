"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LocalVideo from "../../../../features/RoomChat/components/LocalVideo";
import RemoteVideo from "../../../../features/RoomChat/components/RemoteVideo";
import ChatBox from "../../../../features/RoomChat/components/RoomChatBox";
import {
  connectRoomSocket,
  disconnectRoomSocket,
} from "../../../../features/RoomChat/services/roomSocketService";

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

  // Start camera & mic
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setPeers((p) => ({ ...p }));

        // Mute/unmute and speaking detection
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
        console.error("Camera error:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const createPeerConnection = (peerId: string, name?: string) => {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId].pc;

    const socket = socketRef.current;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
      } catch (e) {
        console.warn("Failed to add local tracks:", e);
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit("room-ice", { roomId: id, candidate: e.candidate, to: peerId });
      }
    };

    pc.ontrack = (e) => {
      if (!e.streams || !e.streams[0]) return;
      setPeers((prev) => ({ ...prev, [peerId]: e.streams[0] }));

      // Speaking detection for remote
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

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        removePeer(peerId);
      }
    };

    peerConnections.current[peerId] = { pc, name };
    return pc;
  };

  const removePeer = (peerId: string) => {
    const data = peerConnections.current[peerId];
    if (data?.pc) {
      try { data.pc.close(); } catch (e) {}
    }
    delete peerConnections.current[peerId];
    setPeers((prev) => {
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
    setSpeakingPeers((prev) => {
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
  };

  const createOfferToPeer = async (peerId: string, name?: string) => {
    if (!localStreamRef.current || peerConnections.current[peerId]) return;

    const pc = createPeerConnection(peerId, name);
    try {
      localStreamRef.current.getTracks().forEach((t) => {
        try { pc.addTrack(t, localStreamRef.current!); } catch {}
      });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("room-offer", { roomId: id, offer, to: peerId });
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  };

  const cleanupAllPeers = () => {
    Object.keys(peerConnections.current).forEach((pid) => {
      try { peerConnections.current[pid].pc.close(); } catch {}
      delete peerConnections.current[pid];
    });
    setPeers({});
    setSpeakingPeers({});
  };

  // Socket logic
  useEffect(() => {
    if (!localStreamRef.current) return;

    const socket = connectRoomSocket();
    socketRef.current = socket;

    socket.emit("list-rooms");
    socket.on("rooms", (roomsArray: RoomInfo[]) => {
      const found = (roomsArray || []).find((r) => r.id === id);
      if (found) {
        const users = (found.users || []).map((u: any) =>
          typeof u === "string" ? { socketId: u, userInfo: {} } : u
        );
        setRoom({ ...found, users });
      }
    });

    socket.on("room-users", (users: RoomUser[]) => {
      setRoom((prev) => ({ ...(prev || {}), users: users || [] } as RoomInfo));
      users.forEach((u) => { if (u.socketId !== socket.id) setTimeout(() => createOfferToPeer(u.socketId, u.userInfo?.name), 50); });
    });

    socket.on("user-joined", (payload: any) => {
      if (payload?.socketId) {
        const u: RoomUser = payload;
        setRoom((prev) => {
          const copy = prev ? { ...prev } : { id, name: "", topic: "", users: [] } as RoomInfo;
          copy.users = copy.users ? [...copy.users.filter(x => x.socketId !== u.socketId), u] : [u];
          return copy;
        });
        if (payload.socketId !== socket.id) setTimeout(() => createOfferToPeer(payload.socketId, payload.userInfo?.name), 50);
      }
    });

    socket.on("room-offer", async ({ from, offer, name }: { from: string; offer: RTCSessionDescriptionInit; name?: string }) => {
      const pc = createPeerConnection(from, name);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      localStreamRef.current?.getTracks().forEach((t) => { try { pc.addTrack(t, localStreamRef.current!); } catch {} });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("room-answer", { roomId: id, answer, to: from });
    });

    socket.on("room-answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current[from]?.pc;
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("room-ice", ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current[from]?.pc;
      if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });

    socket.on("user-left", ({ userId }: { userId: string }) => {
      removePeer(userId);
      setRoom((prev) => prev ? { ...prev, users: prev.users.filter(u => u.socketId !== userId) } : prev);
    });

    socket.emit("join-room", { roomId: id, user: userInfo });

    return () => {
      try { socket.emit("leave-room", { roomId: id, userId: socket.id }); } catch {}
      cleanupAllPeers();
      disconnectRoomSocket();
      socketRef.current = null;
    };
  }, [id, userInfo]);

  if (!localStreamRef.current) return <p>Loading camera...</p>;

  const totalUsers = (room?.users?.length || Object.keys(peers).length + 1) || 1;
  const getGridCols = () => {
    if (totalUsers === 1) return "grid-cols-1";
    if (totalUsers === 2) return "grid-cols-2";
    if (totalUsers <= 4) return "grid-cols-2 md:grid-cols-2";
    if (totalUsers <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = muted));
    setMuted(!muted);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((track) => (track.enabled = cameraOff));
    setCameraOff(!cameraOff);
  };

  const leaveRoom = () => {
    cleanupAllPeers();
    disconnectRoomSocket();
    router.push("/"); // redirect to home
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 min-h-screen">
      <div className={`flex-1 grid ${getGridCols()} gap-4`}>
        <div className="relative">
          <LocalVideo
            stream={localStreamRef.current}
            label={userInfo?.name || "You"}
            isSpeaking={speakingPeers["local"] || false}
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              className="bg-white dark:bg-gray-700 p-1 rounded"
              onClick={toggleMute}
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              className="bg-white dark:bg-gray-700 p-1 rounded"
              onClick={toggleCamera}
            >
              {cameraOff ? "Camera On" : "Camera Off"}
            </button>
            <button
              className="bg-red-500 text-white p-1 rounded"
              onClick={leaveRoom}
            >
              Leave
            </button>
          </div>
        </div>
        {Object.entries(peers).map(([peerId, stream]) => {
          const name = peerConnections.current[peerId]?.name || "Stranger";
          return (
            <RemoteVideo
              key={peerId}
              stream={stream}
              label={name}
              isSpeaking={speakingPeers[peerId] || false}
            />
          );
        })}
      </div>

      <div className="md:w-80 flex-shrink-0">
        {socketRef.current && (
          <ChatBox socket={socketRef.current} roomId={id} userName={userInfo?.name || "You"} />
        )}
      </div>

      {room && (
        <div className="md:w-64 p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg shadow flex-shrink-0">
          <h2 className="text-lg font-bold">{room.name || "Room"}</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">{room.topic}</p>
          {room.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{room.description}</p>
          )}
          <p className="mt-2 text-sm font-medium">Users: {room.users?.length ?? Object.keys(peers).length + 1}</p>
          <div className="mt-3 text-xs text-neutral-600">
            <div>Tip: Use the buttons on your video tile to mute/unmute, toggle camera, or leave.</div>
          </div>
        </div>
      )}
    </div>
  );
}

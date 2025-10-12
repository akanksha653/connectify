// features/RoomSystem/hooks/useRoomWebRTC.ts
import { useEffect, useRef, useState } from "react";
import type { Participant } from "../utils/roomTypes";
import { useRoomSocket } from "./useRoomSocket";

type PeerMap = Record<string, RTCPeerConnection>;

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // Add your TURN servers here if you have them
  ],
};

export function useRoomWebRTC(localStream: MediaStream | null) {
  const { socket } = useRoomSocket();
  const peersRef = useRef<PeerMap>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  useEffect(() => {
    if (!socket) return;

    const onOffer = async ({ offer, sender }: { offer: any; sender: string }) => {
      const pc = createPeerConnection(sender);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (localStream) {
        localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, roomId: currentRoomIdRef.current });
    };

    const onAnswer = async ({ answer, sender }: { answer: any; sender: string }) => {
      const pc = peersRef.current[sender];
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIce = ({ candidate, sender }: { candidate: any; sender: string }) => {
      const pc = peersRef.current[sender];
      if (!pc) return;
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) => console.warn("addIce err:", e));
    };

    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIce);

    return () => {
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIce);
    };
  }, [socket, localStream]);

  const currentRoomIdRef = useRef<string | null>(null);

  const createPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socket && currentRoomIdRef.current) {
        socket.emit("ice-candidate", { candidate: ev.candidate, roomId: currentRoomIdRef.current });
      }
    };

    pc.ontrack = (ev) => {
      setRemoteStreams((s) => ({ ...s, [peerId]: ev.streams[0] }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        delete peersRef.current[peerId];
        setRemoteStreams((s) => {
          const next = { ...s };
          delete next[peerId];
          return next;
        });
      }
    };

    peersRef.current[peerId] = pc;
    return pc;
  };

  const joinRoom = async (roomId: string) => {
    currentRoomIdRef.current = roomId;
    if (!socket) throw new Error("Socket not connected");

    // announce joining room for server to add user list
    socket.emit("join-room", roomId);

    // Optionally: server could send current users then we create offers to them
    // We'll rely on 'user-joined' events (socket) to trigger offer creation.
    socket.on("user-joined", async ({ socketId }: { socketId: string }) => {
      if (!socket) return;
      const pc = createPeerConnection(socketId);
      if (localStream) {
        localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { offer, roomId });
    });
  };

  const leaveRoom = (roomId: string) => {
    currentRoomIdRef.current = null;
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
    socket?.emit("leave-room", { roomId });
  };

  return {
    remoteStreams,
    joinRoom,
    leaveRoom,
  };
}

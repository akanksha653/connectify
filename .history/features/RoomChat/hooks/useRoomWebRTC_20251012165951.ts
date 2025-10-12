// features/RoomSystem/hooks/useRoomWebRTC.ts
import { useEffect, useRef, useState } from "react";
import { useRoomSocket } from "./useRoomSocket";

type PeerMap = Record<string, RTCPeerConnection>;

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // Add your TURN servers here if you have them
  ],
};

export function useRoomWebRTC(localStream: MediaStream | null) {
  const { socket } = useRoomSocket(); // socket might be null initially
  const peersRef = useRef<PeerMap>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const currentRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({ offer, sender }: { offer: RTCSessionDescriptionInit; sender: string }) => {
      const pc = createPeerConnection(sender);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (currentRoomIdRef.current) {
        socket.emit("answer", { answer, roomId: currentRoomIdRef.current });
      }
    };

    const handleAnswer = async ({ answer, sender }: { answer: RTCSessionDescriptionInit; sender: string }) => {
      const pc = peersRef.current[sender];
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIce = ({ candidate, sender }: { candidate: RTCIceCandidateInit; sender: string }) => {
      const pc = peersRef.current[sender];
      if (!pc) return;
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) => console.warn("addIce err:", e));
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIce);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIce);
    };
  }, [socket, localStream]);

  const createPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && currentRoomIdRef.current) {
        socket.emit("ice-candidate", { candidate: event.candidate, roomId: currentRoomIdRef.current });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: event.streams[0] }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        delete peersRef.current[peerId];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    };

    peersRef.current[peerId] = pc;
    return pc;
  };

  const joinRoom = (roomId: string) => {
    currentRoomIdRef.current = roomId;
    if (!socket) return; // socket may not be ready yet

    socket.emit("join-room", { roomId });

    // listen for new users joining
    socket.on("user-joined", async ({ socketId }: { socketId: string }) => {
      if (!socket) return;
      const pc = createPeerConnection(socketId);
      if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { offer, roomId });
    });
  };

  const leaveRoom = () => {
    currentRoomIdRef.current = null;
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
    if (socket) socket.emit("leave-room", { roomId: currentRoomIdRef.current });
  };

  return {
    remoteStreams,
    joinRoom,
    leaveRoom,
  };
}

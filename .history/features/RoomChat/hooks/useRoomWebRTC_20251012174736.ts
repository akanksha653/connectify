// features/RoomChat/hooks/useRoomWebRTC.ts
import { useEffect, useRef, useState } from "react";
import { useRoomSocket } from "./useRoomSocket";

type PeerMap = Record<string, RTCPeerConnection>;

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // Add TURN servers if available
  ],
};

export function useRoomWebRTC(localStream: MediaStream | null) {
  const { socket } = useRoomSocket();
  const peersRef = useRef<PeerMap>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const currentRoomIdRef = useRef<string | null>(null);

  // --- WebRTC Event Handlers ---
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({
      offer,
      sender,
    }: {
      offer: RTCSessionDescriptionInit;
      sender: string;
    }) => {
      let pc = peersRef.current[sender];
      if (!pc || pc.signalingState === "closed") pc = createPeerConnection(sender);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      if (localStream) localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (currentRoomIdRef.current) {
        socket.emit("answer", {
          answer,
          roomId: currentRoomIdRef.current,
          receiver: sender,
        });
      }
    };

    const handleAnswer = async ({
      answer,
      sender,
    }: {
      answer: RTCSessionDescriptionInit;
      sender: string;
    }) => {
      const pc = peersRef.current[sender];
      if (!pc || pc.signalingState === "closed") return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIce = ({
      candidate,
      sender,
    }: {
      candidate: RTCIceCandidateInit;
      sender: string;
    }) => {
      const pc = peersRef.current[sender];
      if (!pc || pc.signalingState === "closed") return;
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
        console.warn("Failed to add ICE candidate:", err);
      });
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

  // --- Create Peer Connection ---
  const createPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && currentRoomIdRef.current) {
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          roomId: currentRoomIdRef.current,
          receiver: peerId,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: event.streams[0] }));
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
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

  // --- Join Room ---
  const joinRoom = (roomId: string) => {
    currentRoomIdRef.current = roomId;
    if (!socket) return;

    socket.emit("join-room", { roomId });

    const handleUserJoined = async ({ socketId }: { socketId: string }) => {
      if (!socket) return;
      const pc = createPeerConnection(socketId);
      if (localStream) localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { offer, roomId, receiver: socketId });
    };

    socket.on("user-joined", handleUserJoined);

    // store listener reference for cleanup
    socket._handleUserJoined = handleUserJoined;
  };

  // --- Leave Room ---
  const leaveRoom = () => {
    if (!currentRoomIdRef.current) return;

    // Close all peer connections
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});

    if (socket) {
      socket.emit("leave-room", { roomId: currentRoomIdRef.current });
      if (socket._handleUserJoined) socket.off("user-joined", socket._handleUserJoined);
    }

    currentRoomIdRef.current = null;
  };

  return {
    remoteStreams,
    joinRoom,
    leaveRoom,
  };
}

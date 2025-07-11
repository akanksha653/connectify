// features/anonymousChat/hooks/useWebRTC.ts

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function useWebRTC(roomId: string) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    const init = async () => {
      socketRef.current = io(SOCKET_URL);
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      socketRef.current.emit("join-room", roomId);

      peerConnectionRef.current = new RTCPeerConnection(iceServers);

      // Add local tracks
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnectionRef.current?.addTrack(track, localStreamRef.current as MediaStream);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      // ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("ice-candidate", event.candidate, roomId);
        }
      };

      socketRef.current.on("offer", async (offer: RTCSessionDescriptionInit) => {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current?.createAnswer();
        await peerConnectionRef.current?.setLocalDescription(answer);
        socketRef.current?.emit("answer", answer, roomId);
      });

      socketRef.current.on("answer", async (answer: RTCSessionDescriptionInit) => {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socketRef.current.on("ice-candidate", async (candidate: RTCIceCandidateInit) => {
        try {
          await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding received ice candidate", error);
        }
      });

      // Create offer if second user joins
      socketRef.current.on("user-joined", async () => {
        const offer = await peerConnectionRef.current?.createOffer();
        await peerConnectionRef.current?.setLocalDescription(offer);
        socketRef.current?.emit("offer", offer, roomId);
      });
    };

    init();

    return () => {
      peerConnectionRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  return { localStream: localStreamRef.current, remoteStream };
}

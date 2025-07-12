// features/anonymousChat/hooks/useWebRTC.ts

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export default function useWebRTC(roomId: string | null, isOfferer: boolean) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    if (!roomId) {
      console.log("⏳ Waiting for server-assigned roomId...");
      return;
    }

    const init = async () => {
      if (!SOCKET_URL) {
        console.error("❌ NEXT_PUBLIC_SOCKET_URL is not defined");
        return;
      }

      try {
        // Connect to signaling server
        socketRef.current = io(SOCKET_URL, {
          transports: ["websocket"],
        });

        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);

        // Create peer connection
        peerConnectionRef.current = new RTCPeerConnection(iceServers);

        // Add local tracks
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnectionRef.current.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
        };

        // Handle ICE candidates generated locally
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current?.emit("ice-candidate", { candidate: event.candidate, roomId });
          }
        };

        // Join room
        socketRef.current.emit("join-room", roomId);

        // If I am offerer, create offer immediately
        if (isOfferer) {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          socketRef.current.emit("offer", { offer, roomId });
        }

        // Listen for offer
        socketRef.current.on("offer", async ({ offer }) => {
          await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnectionRef.current?.createAnswer();
          await peerConnectionRef.current?.setLocalDescription(answer);
          socketRef.current?.emit("answer", { answer, roomId });
        });

        // Listen for answer
        socketRef.current.on("answer", async ({ answer }) => {
          await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        });

        // Listen for ICE candidates from remote peer
        socketRef.current.on("ice-candidate", async ({ candidate }) => {
          try {
            await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error("Error adding received ice candidate", error);
          }
        });

      } catch (error) {
        console.error("❌ Failed to initialize WebRTC:", error);
      }
    };

    init();

    return () => {
      peerConnectionRef.current?.close();
      localStream?.getTracks().forEach((track) => track.stop());
      socketRef.current?.disconnect();
    };
  }, [roomId, isOfferer]);

  return { localStream, remoteStream };
}

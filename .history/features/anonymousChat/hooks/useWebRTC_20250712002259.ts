// features/anonymousChat/hooks/useWebRTC.ts

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

interface MatchedPayload {
  roomId: string;
  partnerId: string;
  isOfferer: boolean;
}

export default function useWebRTC(
  roomId: string | null,
  isOfferer: boolean | null,
  socket: Socket | null
) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    if (!roomId || !socket) {
      console.log("⏳ Waiting for roomId and socket...");
      return;
    }

    const init = async () => {
      try {
        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        console.log("🎥 Local stream obtained");

        // Create peer connection
        peerConnectionRef.current = new RTCPeerConnection(iceServers);

        // Add local tracks
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnectionRef.current.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
          console.log("📡 Remote stream received");
        };

        // Handle local ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", { candidate: event.candidate, roomId });
            console.log("❄️ Sent local ICE candidate");
          }
        };

        // Listen for offer
        socket.on("offer", async ({ offer }) => {
          console.log("📨 Received offer");
          await peerConnectionRef.current?.setRemoteDescription(
            new RTCSessionDescription(offer)
          );
          const answer = await peerConnectionRef.current?.createAnswer();
          await peerConnectionRef.current?.setLocalDescription(answer);
          socket.emit("answer", { answer, roomId });
          console.log("✅ Sent answer");
        });

        // Listen for answer
        socket.on("answer", async ({ answer }) => {
          console.log("📨 Received answer");
          await peerConnectionRef.current?.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        });

        // Listen for ICE candidates from remote
        socket.on("ice-candidate", async ({ candidate }) => {
          try {
            await peerConnectionRef.current?.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("❄️ Added remote ICE candidate");
          } catch (error) {
            console.error("⚠️ Error adding received ice candidate", error);
          }
        });

        // If this client is offerer, create offer after joining
        if (isOfferer) {
          console.log("🎬 Acting as offerer, creating offer");
          const offer = await peerConnectionRef.current?.createOffer();
          await peerConnectionRef.current?.setLocalDescription(offer);
          socket.emit("offer", { offer, roomId });
        }

      } catch (error) {
        console.error("❌ Failed to initialize WebRTC:", error);
      }
    };

    init();

    return () => {
      // Cleanup
      console.log("♻️ Cleaning up WebRTC resources");
      peerConnectionRef.current?.close();
      localStream?.getTracks().forEach((track) => track.stop());
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [roomId, socket, isOfferer]);

  return { localStream, remoteStream };
}

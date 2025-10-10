import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

interface UseWebRTCProps {
  roomId: string | null;
  isOfferer: boolean | null;
  isStarted: boolean;
  socket: Socket | null; // Reuse the socket from useSocket
}

export default function useWebRTC({
  roomId,
  isOfferer,
  isStarted,
  socket,
}: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // Add TURN server for production
    ],
  };

  useEffect(() => {
    if (!roomId || isOfferer === null || !isStarted || !socket) return;

    let isMounted = true;

    const init = async () => {
      try {
        // ✅ Get local media
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) return;
        setLocalStream(stream);

        // ✅ Create RTCPeerConnection
        const pc = new RTCPeerConnection(iceServers);
        peerRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Receive remote tracks
        pc.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
        };

        // Send ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", { candidate: event.candidate, roomId });
          }
        };

        // Join room and handle offer/answer
        socket.emit("join-room", roomId);

        socket.on("joined-room", async () => {
          if (isOfferer) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { offer, roomId });
          }
        });

        socket.on("offer", async ({ offer }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { answer, roomId });
        });

        socket.on("answer", async ({ answer }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on("ice-candidate", async ({ candidate }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Failed to add ICE candidate:", err);
          }
        });

      } catch (err) {
        console.error("❌ WebRTC init error:", err);
      }
    };

    init();

    return () => {
      isMounted = false;
      peerRef.current?.close();
      localStream?.getTracks().forEach((t) => t.stop());
      peerRef.current = null;
    };
  }, [roomId, isOfferer, isStarted, socket]);

  return { localStream, remoteStream };
}

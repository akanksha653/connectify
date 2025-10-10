import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

interface UseWebRTCProps {
  roomId: string | null;
  isOfferer: boolean | null;
  isStarted: boolean;
  socket: Socket | null;
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
      // You can add a TURN server for production if needed
    ],
  };

  /**
   * 🧹 Cleanup — stops all streams and closes the peer connection
   */
  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning up WebRTC resources...");

    try {
      peerRef.current?.getSenders()?.forEach((sender) => {
        if (sender.track) sender.track.stop();
      });

      peerRef.current?.close();
      peerRef.current = null;

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
      }
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }, [localStream, remoteStream]);

  /**
   * 🎥 Initialize WebRTC
   */
  useEffect(() => {
    if (!roomId || isOfferer === null || !isStarted || !socket) return;

    let isMounted = true;

    const init = async () => {
      try {
        console.log("🎬 Initializing WebRTC...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!isMounted) return;
        setLocalStream(stream);

        const pc = new RTCPeerConnection(iceServers);
        peerRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Receive remote tracks
        pc.ontrack = (event) => {
          console.log("📡 Remote stream received");
          setRemoteStream(event.streams[0]);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", { candidate: event.candidate, roomId });
          }
        };

        // Join room
        socket.emit("join-room", roomId);

        // Handle signaling events
        socket.on("joined-room", async () => {
          if (isOfferer) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { offer, roomId });
          }
        });

        socket.on("offer", async ({ offer }) => {
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { answer, roomId });
          }
        });

        socket.on("answer", async ({ answer }) => {
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        socket.on("ice-candidate", async ({ candidate }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("❌ Failed to add ICE candidate:", err);
          }
        });
      } catch (err) {
        console.error("❌ WebRTC init error:", err);
      }
    };

    init();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [roomId, isOfferer, isStarted, socket, cleanup]);

  return { localStream, remoteStream, cleanup };
}

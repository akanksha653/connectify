import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

/**
 * Hook for WebRTC 1-1 & Room calls
 *
 * @param roomId - room id assigned by server
 * @param isOfferer - true if this client creates the offer
 * @param isStarted - true after user clicks Start/Join
 */
export default function useWebRTC(
  roomId: string | null,
  isOfferer: boolean | null,
  isStarted: boolean
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // ⚠️ add TURN for production if needed
    ],
  };

  useEffect(() => {
    if (!roomId || isOfferer === null || !isStarted) {
      console.log("⏳ Waiting for Start + roomId + role...");
      return;
    }

    if (!SOCKET_URL) {
      console.error("❌ NEXT_PUBLIC_SOCKET_URL is not defined");
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        // ✅ Connect to signaling server
        const socket = io(SOCKET_URL, { transports: ["websocket"] });
        socketRef.current = socket;

        socket.on("connect", () =>
          console.log("✅ Connected to socket:", socket.id)
        );

        // ✅ Get local camera/mic
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!isMounted) return;
        setLocalStream(stream);
        console.log("📷 Local stream ready");

        // ✅ Create PeerConnection
        const pc = new RTCPeerConnection(iceServers);
        peerConnectionRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Remote stream
        pc.ontrack = (event) => {
          console.log("📡 Remote track received");
          setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () =>
          console.log("🔗 Connection:", pc.connectionState);

        // Local ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", { candidate: event.candidate, roomId });
          }
        };

        // ✅ Join room
        socket.emit("join-room", roomId);

        socket.on("joined-room", async () => {
          console.log("🏠 Joined room:", roomId);
          if (isOfferer) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { offer, roomId });
            console.log("📤 Sent offer");
          }
        });

        // ✅ Handle offer
        socket.on("offer", async ({ offer }) => {
          console.log("📩 Got offer");
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { answer, roomId });
          console.log("📤 Sent answer");
        });

        // ✅ Handle answer
        socket.on("answer", async ({ answer }) => {
          console.log("📩 Got answer");
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        // ✅ Handle ICE candidate
        socket.on("ice-candidate", async ({ candidate }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("📩 Added remote ICE candidate");
          } catch (err) {
            console.error("❌ ICE error:", err);
          }
        });
      } catch (err) {
        console.error("❌ WebRTC init failed:", err);
      }
    };

    init();

    return () => {
      isMounted = false;
      console.log("🧹 Cleaning up WebRTC + socket");
      peerConnectionRef.current?.close();
      localStream?.getTracks().forEach((t) => t.stop());
      socketRef.current?.disconnect();
    };
  }, [roomId, isOfferer, isStarted]);

  // ✅ Always return object (safe destructuring)
  return { localStream, remoteStream };
}

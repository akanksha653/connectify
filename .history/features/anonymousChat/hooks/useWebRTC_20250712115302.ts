import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export default function useWebRTC(roomId: string | null, isOfferer: boolean | null) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // 🔒 Add TURN servers for production behind NAT/firewalls
    ],
  };

  const stopWebRTC = useCallback(() => {
    console.log("🛑 Manually stopping WebRTC and socket connections");

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);

    socketRef.current?.disconnect();
    socketRef.current = null;

    setRemoteStream(null);
  }, [localStream]);

  useEffect(() => {
    if (!roomId || isOfferer === null) {
      console.log("⏳ Waiting for server-assigned roomId and role...");
      return;
    }

    const init = async () => {
      if (!SOCKET_URL) {
        console.error("❌ NEXT_PUBLIC_SOCKET_URL is not defined");
        return;
      }

      try {
        // ✅ Connect to signaling server if not connected
        if (!socketRef.current) {
          socketRef.current = io(SOCKET_URL, {
            transports: ["websocket"],
          });

          socketRef.current.on("connect", () => {
            console.log("✅ Connected to socket server:", socketRef.current?.id);
          });
        }

        // ✅ Get local media stream only if not already obtained
        if (!localStream) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setLocalStream(stream);
          console.log("📷 Obtained local media stream");
        }

        // ✅ Create RTCPeerConnection only if not existing
        if (!peerConnectionRef.current) {
          peerConnectionRef.current = new RTCPeerConnection(iceServers);
          console.log("🔧 Created RTCPeerConnection");

          // ✅ Add local tracks
          localStream?.getTracks().forEach((track) => {
            peerConnectionRef.current?.addTrack(track, localStream);
          });

          // ✅ Handle remote stream
          peerConnectionRef.current.ontrack = (event) => {
            console.log("📡 Received remote stream track");
            setRemoteStream(event.streams[0]);
          };

          // ✅ ICE candidates
          peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate) {
              console.log("📤 Sending ICE candidate");
              socketRef.current?.emit("ice-candidate", { candidate: event.candidate, roomId });
            }
          };
        }

        // ✅ Join room and handle offer/answer flow
        socketRef.current.emit("join-room", roomId);

        socketRef.current.on("joined-room", async () => {
          console.log("🏠 Joined room:", roomId);

          if (isOfferer && peerConnectionRef.current) {
            console.log("📞 Creating offer...");
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            socketRef.current?.emit("offer", { offer, roomId });
          }
        });

        socketRef.current.on("offer", async ({ offer }) => {
          console.log("📩 Received offer:", offer);
          await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnectionRef.current?.createAnswer();
          await peerConnectionRef.current?.setLocalDescription(answer);
          socketRef.current?.emit("answer", { answer, roomId });
        });

        socketRef.current.on("answer", async ({ answer }) => {
          console.log("📩 Received answer:", answer);
          await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socketRef.current.on("ice-candidate", async ({ candidate }) => {
          console.log("📩 Received ICE candidate:", candidate);
          try {
            await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error("❌ Error adding received ICE candidate:", error);
          }
        });

      } catch (error) {
        console.error("❌ Failed to initialize WebRTC:", error);
      }
    };

    init();

    return () => {
      stopWebRTC();
    };
  }, [roomId, isOfferer, localStream, stopWebRTC]);

  return { localStream, remoteStream, stopWebRTC };
}

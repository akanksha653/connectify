import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export default function useWebRTC(roomId: string | null, isOfferer: boolean | null, isStarted: boolean) {
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

  useEffect(() => {
    if (!roomId || isOfferer === null || !isStarted) {
      console.log("⏳ Waiting for Start button click + server-assigned roomId + role...");
      return;
    }

    const init = async () => {
      if (!SOCKET_URL) {
        console.error("❌ NEXT_PUBLIC_SOCKET_URL is not defined");
        return;
      }

      try {
        // ✅ Connect to signaling server
        socketRef.current = io(SOCKET_URL, {
          transports: ["websocket"],
        });

        socketRef.current.on("connect", () => {
          console.log("✅ Connected to socket server:", socketRef.current?.id);
        });

        // ✅ Get local media stream AFTER user clicks Start
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        console.log("📷 Obtained local media stream");

        // ✅ Create RTCPeerConnection
        peerConnectionRef.current = new RTCPeerConnection(iceServers);
        console.log("🔧 Created RTCPeerConnection");

        // ✅ Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });

        // ✅ Handle remote stream
        peerConnectionRef.current.ontrack = (event) => {
          console.log("📡 Received remote stream track");
          setRemoteStream(event.streams[0]);
        };

        // ✅ Monitor connection state
        peerConnectionRef.current.onconnectionstatechange = () => {
          console.log("🔗 Connection state:", peerConnectionRef.current?.connectionState);
        };

        // ✅ Handle ICE candidates generated locally
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("📤 Sending ICE candidate");
            socketRef.current?.emit("ice-candidate", { candidate: event.candidate, roomId });
          }
        };

        // ✅ Join room and wait for confirmation before offer creation
        socketRef.current.emit("join-room", roomId);

        socketRef.current.on("joined-room", async (joinedRoomId) => {
          console.log("🏠 Successfully joined room:", joinedRoomId);

          if (isOfferer) {
            console.log("📞 Creating offer...");
            const offer = await peerConnectionRef.current!.createOffer();
            await peerConnectionRef.current!.setLocalDescription(offer);
            socketRef.current?.emit("offer", { offer, roomId });
            console.log("📤 Sent offer:", offer);
          }
        });

        // ✅ Listen for offer
        socketRef.current.on("offer", async ({ offer }) => {
          console.log("📩 Received offer:", offer);
          await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnectionRef.current!.createAnswer();
          await peerConnectionRef.current!.setLocalDescription(answer);
          socketRef.current?.emit("answer", { answer, roomId });
          console.log("📤 Sent answer:", answer);
        });

        // ✅ Listen for answer
        socketRef.current.on("answer", async ({ answer }) => {
          console.log("📩 Received answer:", answer);
          await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(answer));
        });

        // ✅ Listen for ICE candidates from remote peer
        socketRef.current.on("ice-candidate", async ({ candidate }) => {
          console.log("📩 Received ICE candidate:", candidate);
          try {
            await peerConnectionRef.current!.addIceCandidate(new RTCIceCandidate(candidate));
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
      console.log("🧹 Cleaning up WebRTC and socket connections");
      peerConnectionRef.current?.close();
      localStream?.getTracks().forEach((track) => track.stop());
      socketRef.current?.disconnect();
    };
  }, [roomId, isOfferer, isStarted]);

  return { localStream, remoteStream };
}

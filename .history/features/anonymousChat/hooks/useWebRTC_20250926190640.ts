// features/anonymousChat/hooks/useWebRTC.ts
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

interface PeerStreams {
  [peerId: string]: MediaStream;
}

export default function useWebRTC(
  roomId: string | null,
  isOfferer: boolean | null,
  isStarted: boolean
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<PeerStreams>({});
  const peerConnections = useRef<{ [peerId: string]: RTCPeerConnection }>({});
  const socketRef = useRef<Socket | null>(null);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // 🔒 Add TURN servers for production
    ],
  };

  useEffect(() => {
    if (!roomId || isOfferer === null || !isStarted) return;

    const init = async () => {
      if (!SOCKET_URL) {
        console.error("❌ NEXT_PUBLIC_SOCKET_URL is not defined");
        return;
      }

      try {
        socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });

        socketRef.current.on("connect", () => {
          console.log("✅ Connected to signaling server:", socketRef.current?.id);
        });

        // --- Local Media ---
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);

        // --- Join Room ---
        socketRef.current.emit("join-room", roomId);

        // --- Handle New Users Joining the Room ---
        socketRef.current.on("user-joined", ({ userId }: { userId: string }) => {
          console.log("👥 User joined:", userId);
          createPeer(userId, true);
        });

        // --- Handle Offers from Other Peers ---
        socketRef.current.on(
          "room-offer",
          async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
            const pc = createPeer(from, false);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current?.emit("room-answer", { roomId, answer, to: from });
          }
        );

        // --- Handle Answers from Other Peers ---
        socketRef.current.on(
          "room-answer",
          async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
            const pc = peerConnections.current[from];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        );

        // --- Handle ICE Candidates ---
        socketRef.current.on(
          "room-ice",
          async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
            const pc = peerConnections.current[from];
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        );

        // --- Handle User Leaving ---
        socketRef.current.on("user-left", ({ userId }: { userId: string }) => {
          console.log("❌ User left:", userId);
          const pc = peerConnections.current[userId];
          if (pc) pc.close();
          delete peerConnections.current[userId];
          setRemoteStreams((prev) => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
          });
        });

        // --- Create Peer Connection ---
        const createPeer = (peerId: string, offer: boolean) => {
          if (peerConnections.current[peerId]) return peerConnections.current[peerId];
          const pc = new RTCPeerConnection(iceServers);

          // Add local tracks
          localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream));

          // On remote track
          pc.ontrack = (event) => {
            setRemoteStreams((prev) => ({ ...prev, [peerId]: event.streams[0] }));
          };

          // On ICE candidate
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current?.emit("room-ice", {
                roomId,
                candidate: event.candidate,
                to: peerId,
              });
            }
          };

          peerConnections.current[peerId] = pc;

          if (offer) {
            // Create and send offer
            pc.createOffer()
              .then((o) => pc.setLocalDescription(o))
              .then(() => {
                socketRef.current?.emit("room-offer", { roomId, offer: pc.localDescription, to: peerId });
              });
          }

          return pc;
        };
      } catch (err) {
        console.error("❌ WebRTC init failed:", err);
      }
    };

    init();

    return () => {
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      localStream?.getTracks().forEach((t) => t.stop());
      socketRef.current?.disconnect();
    };
  }, [roomId, isOfferer, isStarted]);

  return { localStream, remoteStreams };
}

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

/**
 * useWebRTC
 * - Supports anonymous 1-1 calls (legacy)
 * - Supports group rooms (new)
 *
 * @param roomId       room id (uuid or custom)
 * @param isOfferer    true if this peer should create the first offer (1-1 only)
 * @param isStarted    start flag to delay camera/mic access until user clicks Start
 * @param isGroup      true => group room mode, false => 1-1 mode
 */
export default function useWebRTC(
  roomId: string | null,
  isOfferer: boolean | null,
  isStarted: boolean,
  isGroup: boolean = false
) {
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // 🔒 Add TURN servers in production for NAT traversal
    ],
  };

  useEffect(() => {
    if (!roomId || !isStarted || (isOfferer === null && !isGroup)) {
      console.log("⏳ Waiting for required parameters…");
      return;
    }

    const init = async () => {
      if (!SOCKET_URL) {
        console.error("❌ NEXT_PUBLIC_SOCKET_URL is not defined");
        return;
      }

      // 1️⃣ Connect to signaling server
      const socket = io(SOCKET_URL, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () =>
        console.log("✅ Connected to signaling server:", socket.id)
      );

      // 2️⃣ Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      console.log("📷 Local media stream ready");

      // Helper to create & store a peer connection for a remote user
      const createPeer = (peerId: string, isInitiator: boolean) => {
        const pc = new RTCPeerConnection(iceServers);
        peersRef.current.set(peerId, pc);

        // Add local tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Remote stream handler
        pc.ontrack = (event) => {
          console.log("📡 Remote track from", peerId);
          setRemoteStreams((prev) => {
            // avoid duplicates
            if (prev.find((s) => s.id === event.streams[0].id)) return prev;
            return [...prev, event.streams[0]];
          });
        };

        // ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              candidate: event.candidate,
              roomId,
              target: peerId,
            });
          }
        };

        // Create offer if needed
        if (isInitiator) {
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer).then(() => offer))
            .then((offer) => {
              socket.emit("offer", { offer, roomId, target: peerId });
            });
        }

        return pc;
      };

      // 3️⃣ Join the room
      if (isGroup) {
        socket.emit("room:join", { roomId });

        // Receive list of existing peers to connect to
        socket.on("room:peers", ({ peers }) => {
          peers.forEach((peerId: string) => createPeer(peerId, true));
        });

        // New peer joined
        socket.on("room:new-peer", ({ peerId }) => {
          createPeer(peerId, true);
        });
      } else {
        // legacy 1-1 flow
        socket.emit("join-room", roomId);
        socket.on("joined-room", async () => {
          if (isOfferer) {
            const pc = createPeer("single", true);
            peersRef.current.set("single", pc);
          }
        });
      }

      // 4️⃣ Signaling handlers
      socket.on("offer", async ({ offer, sender }) => {
        const pc = createPeer(sender, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { answer, roomId, target: sender });
      });

      socket.on("answer", async ({ answer, sender }) => {
        const pc = peersRef.current.get(sender);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on("ice-candidate", async ({ candidate, sender }) => {
        const pc = peersRef.current.get(sender);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("❌ Error adding ICE candidate:", err);
          }
        }
      });

      socket.on("peer-left", ({ peerId }) => {
        console.log("👋 Peer left:", peerId);
        const pc = peersRef.current.get(peerId);
        if (pc) pc.close();
        peersRef.current.delete(peerId);
        setRemoteStreams((prev) => prev.filter((s) => s.id !== peerId));
      });
    };

    init();

    return () => {
      console.log("🧹 Cleaning up WebRTC");
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      localStream?.getTracks().forEach((t) => t.stop());
      socketRef.current?.disconnect();
    };
  }, [roomId, isOfferer, isStarted, isGroup]);

  return { localStream, remoteStreams };
}

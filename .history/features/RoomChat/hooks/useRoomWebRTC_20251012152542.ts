import { useEffect, useRef, useState } from "react";
import {
  getRoomSocket,
  sendRoomOffer,
  sendRoomAnswer,
  sendRoomIce,
} from "../services/roomSocketService";

interface PeersMap {
  [peerId: string]: RTCPeerConnection;
}

interface RemoteStreamsMap {
  [peerId: string]: MediaStream;
}

export default function useRoomWebRTC(localStream: MediaStream | null, roomId: string) {
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamsMap>({});
  const peerConnections = useRef<PeersMap>({});
  const socket = getRoomSocket();

  // --------------------------------------------------------------------
  // 🧩 Helper: Create PeerConnection
  // --------------------------------------------------------------------
  const createPeerConnection = (peerId: string): RTCPeerConnection | null => {
    if (!localStream) {
      console.warn("⚠️ Cannot create PeerConnection: localStream missing");
      return null;
    }
    if (peerConnections.current[peerId]) return peerConnections.current[peerId];

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // 🔊 Add local tracks
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // 🎧 Handle remote tracks
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: event.streams[0],
      }));
    };

    // ❄️ Handle ICE candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendRoomIce(peerId, roomId, event.candidate);
      }
    };

    // 🔁 Handle renegotiation needed (debounced)
    let makingOffer = false;
    pc.onnegotiationneeded = async () => {
      try {
        if (makingOffer) return;
        makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendRoomOffer(peerId, roomId, offer);
      } catch (err) {
        console.error("❌ Renegotiation failed:", err);
      } finally {
        makingOffer = false;
      }
    };

    // 🧹 Cleanup on connection state change
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.warn(`💔 Peer ${peerId} disconnected`);
        removePeerConnection(peerId);
      }
    };

    peerConnections.current[peerId] = pc;
    return pc;
  };

  // --------------------------------------------------------------------
  // 🧹 Remove specific peer connection
  // --------------------------------------------------------------------
  const removePeerConnection = (peerId: string) => {
    const pc = peerConnections.current[peerId];
    if (pc) {
      pc.close();
      delete peerConnections.current[peerId];
      setRemoteStreams((prev) => {
        const updated = { ...prev };
        delete updated[peerId];
        return updated;
      });
    }
  };

  // --------------------------------------------------------------------
  // 🚪 Close all peer connections
  // --------------------------------------------------------------------
  const closeAllPeers = () => {
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
  };

  // --------------------------------------------------------------------
  // 📡 Socket Listeners (Offers, Answers, ICE)
  // --------------------------------------------------------------------
  useEffect(() => {
    if (!socket || !roomId) return;

    // --- Handle incoming offer ---
    const handleOffer = async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      try {
        const pc = createPeerConnection(from);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendRoomAnswer(from, roomId, answer);
      } catch (err) {
        console.error("❌ Error handling offer:", err);
      }
    };

    // --- Handle incoming answer ---
    const handleAnswer = async ({
      from,
      answer,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      try {
        const pc = peerConnections.current[from];
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("❌ Error setting remote description (answer):", err);
      }
    };

    // --- Handle incoming ICE candidates ---
    const handleIce = async ({
      from,
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        const pc = peerConnections.current[from];
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("❌ Error adding ICE candidate:", err);
      }
    };

    // ✅ Attach socket listeners
    socket.on("room-offer", handleOffer);
    socket.on("room-answer", handleAnswer);
    socket.on("room-ice", handleIce);

    // 🧹 Cleanup on unmount or room change
    return () => {
      socket.off("room-offer", handleOffer);
      socket.off("room-answer", handleAnswer);
      socket.off("room-ice", handleIce);
      closeAllPeers();
    };
  }, [socket, roomId, localStream]);

  // --------------------------------------------------------------------
  // 🎙️ Control utilities
  // --------------------------------------------------------------------
  const toggleAudio = (enabled: boolean) => {
    localStream?.getAudioTracks().forEach((track) => (track.enabled = enabled));
  };

  const toggleVideo = (enabled: boolean) => {
    localStream?.getVideoTracks().forEach((track) => (track.enabled = enabled));
  };

  return {
    remoteStreams,
    peerConnections: peerConnections.current,
    createPeerConnection,
    removePeerConnection,
    closeAllPeers,
    toggleAudio,
    toggleVideo,
  };
}

import { useEffect, useRef, useState } from "react";
import { sendRoomIce } from "../services/roomSocketService";

interface PeersMap {
  [peerId: string]: RTCPeerConnection;
}

export default function useRoomWebRTC(localStream: MediaStream | null, roomId: string) {
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const peerConnections = useRef<PeersMap>({});

  /**
   * Create a new RTCPeerConnection for a given peer
   */
  const createPeerConnection = (peerId: string) => {
    if (!localStream) throw new Error("Local stream not available");

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // ✅ Add local tracks
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // ✅ Handle remote tracks
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: event.streams[0],
      }));
    };

    // ✅ Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendRoomIce(peerId, roomId, event.candidate);
      }
    };

    peerConnections.current[peerId] = pc;
    return pc;
  };

  /**
   * Remove a specific peer and clean up its connection
   */
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

  /**
   * Close all peer connections
   */
  const closeAllPeers = () => {
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
  };

  // ✅ Automatically close connections when hook is unmounted
  useEffect(() => {
    return () => {
      closeAllPeers();
    };
    // roomId is included so peers reset if user switches rooms
  }, [roomId]);

  return {
    remoteStreams,
    peerConnections,
    createPeerConnection,
    removePeerConnection,
    closeAllPeers,
  };
}

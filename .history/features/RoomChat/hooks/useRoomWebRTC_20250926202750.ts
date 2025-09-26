import { useEffect, useRef, useState } from "react";
import { sendRoomOffer, sendRoomAnswer, sendRoomIce } from "../services/roomSocketService";

interface PeersMap {
  [peerId: string]: RTCPeerConnection;
}

export default function useRoomWebRTC(localStream: MediaStream | null, roomId: string) {
  const [remoteStreams, setRemoteStreams] = useState<{ [peerId: string]: MediaStream }>({});
  const peerConnections = useRef<PeersMap>({});

  const createPeerConnection = (peerId: string) => {
    if (!localStream) throw new Error("Local stream not available");

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    // Add local tracks
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    // Handle remote tracks
    pc.ontrack = (e) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: e.streams[0] }));
    };

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) sendRoomIce(peerId, roomId, e.candidate);
    };

    peerConnections.current[peerId] = pc;
    return pc;
  };

  const closePeerConnections = () => {
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
  };

  return { remoteStreams, peerConnections, createPeerConnection, closePeerConnections };
}

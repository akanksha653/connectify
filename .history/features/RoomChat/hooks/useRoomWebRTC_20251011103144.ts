import { useEffect, useRef, useState } from "react";
import { getRoomSocket, sendRoomOffer, sendRoomAnswer, sendRoomIce } from "../services/roomSocketService";

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

  /** ---- Create a new peer connection ---- */
  const createPeerConnection = (peerId: string) => {
    if (!localStream) return null;
    if (peerConnections.current[peerId]) return peerConnections.current[peerId];

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add local tracks
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // Remote tracks
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: event.streams[0],
      }));
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) sendRoomIce(peerId, roomId, event.candidate);
    };

    peerConnections.current[peerId] = pc;
    return pc;
  };

  /** ---- Remove a peer connection ---- */
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

  /** ---- Close all peers ---- */
  const closeAllPeers = () => {
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
  };

  /** ---- Socket listeners ---- */
  useEffect(() => {
    if (!socket || !roomId) return;

    // When a new offer is received
    const handleOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(from);
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendRoomAnswer(from, roomId, answer);
    };

    // When an answer is received
    const handleAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current[from];
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    // When ICE candidate is received
    const handleIce = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current[from];
      if (!pc || !candidate) return;
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    socket.on("room-offer", handleOffer);
    socket.on("room-answer", handleAnswer);
    socket.on("room-ice", handleIce);

    return () => {
      socket.off("room-offer", handleOffer);
      socket.off("room-answer", handleAnswer);
      socket.off("room-ice", handleIce);
      closeAllPeers();
    };
  }, [socket, roomId, localStream]);

  return {
    remoteStreams,
    peerConnections: peerConnections.current,
    createPeerConnection,
    removePeerConnection,
    closeAllPeers,
  };
}

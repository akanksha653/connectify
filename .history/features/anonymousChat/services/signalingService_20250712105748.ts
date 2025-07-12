// features/anonymousChat/services/signalingService.ts

import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://akku-production.up.railway.app";

let socket: Socket | null = null;

/**
 * Connects to the Socket.IO server if not already connected.
 */
export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("✅ Connected to signaling server:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from signaling server");
    });

    // ✅ Listen for joined-room confirmation
    socket.on("joined-room", (roomId: string) => {
      console.log("✅ Successfully joined room:", roomId);
    });
  }
};

/**
 * Disconnects the Socket.IO connection.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Joins a room with given roomId.
 */
export const joinRoom = (roomId: string) => {
  socket?.emit("join-room", roomId);
};

/**
 * Listen for joined-room confirmation.
 */
export const onJoinedRoom = (callback: (roomId: string) => void) => {
  socket?.on("joined-room", callback);
};

/**
 * Listen for when another user joins.
 */
export const onUserJoined = (callback: (userId: string) => void) => {
  socket?.on("user-joined", callback);
};

/**
 * Sends an offer to the room.
 */
export const sendOffer = (offer: RTCSessionDescriptionInit, roomId: string) => {
  socket?.emit("offer", { offer, roomId });
};

/**
 * Listen for an offer.
 */
export const onOffer = (callback: (data: { offer: RTCSessionDescriptionInit; sender: string }) => void) => {
  socket?.on("offer", callback);
};

/**
 * Sends an answer to the room.
 */
export const sendAnswer = (answer: RTCSessionDescriptionInit, roomId: string) => {
  socket?.emit("answer", { answer, roomId });
};

/**
 * Listen for an answer.
 */
export const onAnswer = (callback: (data: { answer: RTCSessionDescriptionInit; sender: string }) => void) => {
  socket?.on("answer", callback);
};

/**
 * Sends ICE candidate to the room.
 */
export const sendIceCandidate = (candidate: RTCIceCandidateInit, roomId: string) => {
  socket?.emit("ice-candidate", { candidate, roomId });
};

/**
 * Listen for ICE candidates.
 */
export const onIceCandidate = (callback: (data: { candidate: RTCIceCandidateInit; sender: string }) => void) => {
  socket?.on("ice-candidate", callback);
};

/**
 * Sends a chat message to the room with UUID.
 */
export const sendMessage = (message: string, roomId: string) => {
  const messageId = uuidv4();
  socket?.emit("send-message", { messageId, message, roomId });
};

/**
 * Listen for chat messages.
 */
export const onReceiveMessage = (callback: (data: { messageId: string; message: string; sender: string }) => void) => {
  socket?.on("receive-message", callback);
};

export default {
  connectSocket,
  disconnectSocket,
  joinRoom,
  onJoinedRoom, // ✅ added joined-room listener
  onUserJoined,
  sendOffer,
  onOffer,
  sendAnswer,
  onAnswer,
  sendIceCandidate,
  onIceCandidate,
  sendMessage,
  onReceiveMessage,
};

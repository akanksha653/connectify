// features/anonymousChat/services/signalingService.ts

import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://akku-production.up.railway.app";

let socket: Socket | null = null;

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

    socket.on("joined-room", (roomId: string) => {
      console.log("✅ Successfully joined room:", roomId);
    });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinRoom = (roomId: string) => {
  socket?.emit("join-room", roomId);
};

export const onJoinedRoom = (callback: (roomId: string) => void) => {
  socket?.on("joined-room", callback);
};

export const sendOffer = (offer: RTCSessionDescriptionInit, roomId: string) => {
  socket?.emit("offer", { offer, roomId });
};

export const onOffer = (callback: (data: { offer: RTCSessionDescriptionInit; sender: string }) => void) => {
  socket?.on("offer", callback);
};

export const sendAnswer = (answer: RTCSessionDescriptionInit, roomId: string) => {
  socket?.emit("answer", { answer, roomId });
};

export const onAnswer = (callback: (data: { answer: RTCSessionDescriptionInit; sender: string }) => void) => {
  socket?.on("answer", callback);
};

export const sendIceCandidate = (candidate: RTCIceCandidateInit, roomId: string) => {
  socket?.emit("ice-candidate", { candidate, roomId });
};

export const onIceCandidate = (callback: (data: { candidate: RTCIceCandidateInit; sender: string }) => void) => {
  socket?.on("ice-candidate", callback);
};

export const sendMessage = (message: string, roomId: string) => {
  const messageId = uuidv4();
  socket?.emit("send-message", { messageId, message, roomId });
};

export const onReceiveMessage = (callback: (data: { messageId: string; message: string; sender: string }) => void) => {
  socket?.on("receive-message", callback);
};

export default {
  connectSocket,
  disconnectSocket,
  joinRoom,
  onJoinedRoom,
  sendOffer,
  onOffer,
  sendAnswer,
  onAnswer,
  sendIceCandidate,
  onIceCandidate,
  sendMessage,
  onReceiveMessage,
};

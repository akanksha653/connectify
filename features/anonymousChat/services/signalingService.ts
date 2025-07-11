// features/anonymousChat/services/signalingService.ts

import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

let socket: Socket | null = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL);
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

export const onUserJoined = (callback: () => void) => {
  socket?.on("user-joined", callback);
};

export const sendOffer = (offer: RTCSessionDescriptionInit, roomId: string) => {
  socket?.emit("offer", offer, roomId);
};

export const onOffer = (callback: (offer: RTCSessionDescriptionInit) => void) => {
  socket?.on("offer", callback);
};

export const sendAnswer = (answer: RTCSessionDescriptionInit, roomId: string) => {
  socket?.emit("answer", answer, roomId);
};

export const onAnswer = (callback: (answer: RTCSessionDescriptionInit) => void) => {
  socket?.on("answer", callback);
};

export const sendIceCandidate = (candidate: RTCIceCandidateInit, roomId: string) => {
  socket?.emit("ice-candidate", candidate, roomId);
};

export const onIceCandidate = (callback: (candidate: RTCIceCandidateInit) => void) => {
  socket?.on("ice-candidate", callback);
};

export default {
  connectSocket,
  disconnectSocket,
  joinRoom,
  onUserJoined,
  sendOffer,
  onOffer,
  sendAnswer,
  onAnswer,
  sendIceCandidate,
  onIceCandidate,
};

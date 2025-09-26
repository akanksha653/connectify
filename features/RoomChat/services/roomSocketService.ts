import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SOCKET_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

let socket: Socket | null = null;

export const connectRoomSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("✅ Connected to room server:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from room server");
    });
  }
};

export const disconnectRoomSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getRoomSocket = () => socket;

// --- Room Operations ---

export const createRoom = (room: any) => {
  socket?.emit("create-room", room);
};

export const listRooms = () => {
  socket?.emit("list-rooms");
};

export const joinRoom = (roomId: string) => {
  socket?.emit("join-room-dynamic", { roomId });
};

export const leaveRoom = (roomId: string) => {
  socket?.emit("leave-room", { roomId });
};

// --- Messaging ---

export const sendRoomMessage = (roomId: string, text: string) => {
  const message = {
    id: uuidv4(),
    text,
    user: socket?.id,
    timestamp: new Date().toISOString(),
  };
  socket?.emit("room-message", { roomId, ...message });
};

export const onRoomMessage = (callback: (msg: any) => void) => {
  socket?.off("room-message").on("room-message", callback);
};

// --- WebRTC ---

export const sendRoomOffer = (to: string, roomId: string, offer: RTCSessionDescriptionInit) => {
  socket?.emit("room-offer", { to, roomId, offer });
};

export const sendRoomAnswer = (to: string, roomId: string, answer: RTCSessionDescriptionInit) => {
  socket?.emit("room-answer", { to, roomId, answer });
};

export const sendRoomIce = (to: string, roomId: string, candidate: RTCIceCandidateInit) => {
  socket?.emit("room-ice", { to, roomId, candidate });
};

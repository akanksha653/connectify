import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

// ✅ Use your signaling server URL
const SOCKET_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

// Single socket instance for /rooms namespace
let socket: Socket | null = null;

/** Connect to the room socket server (namespace /rooms) */
export const connectRoomSocket = (): Socket => {
  if (!socket) {
    socket = io(`${SOCKET_URL}/rooms`, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("✅ Connected to /rooms server:", socket!.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from /rooms server:", reason);
    });
  }
  return socket;
};

/** Disconnect from room server */
export const disconnectRoomSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/** Get current socket instance */
export const getRoomSocket = (): Socket | null => socket;

// -------------------------------------------------
// ⚡ Room Operations
// -------------------------------------------------
export interface Room {
  id: string;
  name: string;
  topic: string;
  description?: string;
  hasPassword: boolean;
  password?: string | null;
  users?: { socketId: string; userInfo: any }[];
}

/** Join a room */
export const joinRoom = (roomId: string, user: any): void => {
  socket?.emit("join-room", { roomId, user });
};

/** Leave a room */
export const leaveRoom = (roomId: string, userId: string): void => {
  socket?.emit("leave-room", { roomId, userId });
};

// -------------------------------------------------
// 💬 Messaging
// -------------------------------------------------
export interface RoomMessage {
  id: string;
  text: string;
  user: string | undefined;
  timestamp: string;
}

/** Send a message to the room */
export const sendRoomMessage = (roomId: string, text: string): void => {
  const message: RoomMessage = {
    id: uuidv4(),
    text,
    user: socket?.id,
    timestamp: new Date().toISOString(),
  };
  socket?.emit("send-message", { roomId, message });
};

/** Listen for incoming room messages */
export const onRoomMessage = (callback: (msg: RoomMessage) => void): void => {
  socket?.off("receive-message").on("receive-message", (data) => {
    callback(data.message);
  });
};

// -------------------------------------------------
// ⌨️ Typing indicator
// -------------------------------------------------
export const sendTyping = (roomId: string, userId: string): void => {
  socket?.emit("typing", { roomId, userId });
};

export const onTyping = (callback: (data: any) => void): void => {
  socket?.off("typing").on("typing", callback);
};

// -------------------------------------------------
// 🎥 WebRTC Signaling
// -------------------------------------------------
export const sendRoomOffer = (
  to: string,
  roomId: string,
  offer: RTCSessionDescriptionInit
): void => {
  socket?.emit("room-offer", { to, roomId, offer });
};

export const sendRoomAnswer = (
  to: string,
  roomId: string,
  answer: RTCSessionDescriptionInit
): void => {
  socket?.emit("room-answer", { to, roomId, answer });
};

export const sendRoomIce = (
  to: string,
  roomId: string,
  candidate: RTCIceCandidateInit
): void => {
  socket?.emit("room-ice", { to, roomId, candidate });
};

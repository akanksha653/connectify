import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

// -------------------------------------------------
// Constants
// -------------------------------------------------
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

const NAMESPACE = "/rooms";

// -------------------------------------------------
// Socket Singleton
// -------------------------------------------------
let socket: Socket | null = null;

/** Initialize and connect to the /rooms namespace */
export const connectRoomSocket = (): Socket => {
  if (socket && socket.connected) return socket;

  socket = io(`${SOCKET_URL}${NAMESPACE}`, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // --- Lifecycle Events ---
  socket.on("connect", () => {
    console.log(`✅ Connected to ${NAMESPACE} as ${socket!.id}`);
  });

  socket.on("disconnect", (reason) => {
    console.warn(`❌ Disconnected from ${NAMESPACE}:`, reason);
  });

  socket.on("connect_error", (err) => {
    console.error(`⚠️ Connection error (${NAMESPACE}):`, err.message);
  });

  return socket;
};

/** Disconnect and cleanup */
export const disconnectRoomSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    console.log(`🔌 Disconnected cleanly from ${NAMESPACE}`);
  }
};

/** Get the active socket instance */
export const getRoomSocket = (): Socket | null => socket;

// -------------------------------------------------
// Interfaces
// -------------------------------------------------
export interface RoomUser {
  socketId: string;
  userInfo: {
    name?: string;
    avatar?: string;
    country?: string;
    [key: string]: any;
  };
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  description?: string;
  hasPassword: boolean;
  password?: string | null;
  users?: RoomUser[];
}

export interface RoomMessage {
  id: string;
  text: string;
  userId: string;
  username?: string;
  timestamp: string;
}

// -------------------------------------------------
// Room Events
// -------------------------------------------------
export const joinRoom = (roomId: string, user: RoomUser["userInfo"]): void => {
  socket?.emit("join-room", { roomId, user });
};

export const leaveRoom = (roomId: string, userId: string): void => {
  socket?.emit("leave-room", { roomId, userId });
};

// Listen for room user updates (optional helper)
export const onRoomUsersUpdate = (
  callback: (users: RoomUser[]) => void
): void => {
  socket?.off("room-users").on("room-users", callback);
};

// -------------------------------------------------
// Messaging
// -------------------------------------------------
export const sendRoomMessage = (
  roomId: string,
  text: string,
  userId?: string,
  username?: string
): void => {
  if (!socket?.connected) {
    console.warn("⚠️ Cannot send message: Socket not connected");
    return;
  }

  const message: RoomMessage = {
    id: uuidv4(),
    text: text.trim(),
    userId: userId || socket.id!,
    username,
    timestamp: new Date().toISOString(),
  };

  socket.emit("send-message", { roomId, message });
};

export const onRoomMessage = (callback: (msg: RoomMessage) => void): void => {
  socket?.off("receive-message").on("receive-message", (data) => {
    if (data?.message) callback(data.message);
  });
};

// -------------------------------------------------
// Typing Events
// -------------------------------------------------
export const sendTyping = (roomId: string, userId: string): void => {
  socket?.emit("typing", { roomId, userId });
};

export const onTyping = (
  callback: (data: { roomId: string; userId: string }) => void
): void => {
  socket?.off("typing").on("typing", callback);
};

// -------------------------------------------------
// WebRTC Signaling
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

// --- Incoming signaling listeners ---
export const onRoomOffer = (
  callback: (data: { from: string; offer: RTCSessionDescriptionInit }) => void
): void => {
  socket?.off("room-offer").on("room-offer", callback);
};

export const onRoomAnswer = (
  callback: (data: { from: string; answer: RTCSessionDescriptionInit }) => void
): void => {
  socket?.off("room-answer").on("room-answer", callback);
};

export const onRoomIce = (
  callback: (data: { from: string; candidate: RTCIceCandidateInit }) => void
): void => {
  socket?.off("room-ice").on("room-ice", callback);
};

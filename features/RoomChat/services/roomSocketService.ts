import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc } from "firebase/firestore";

// -------------------------------------------------
// Constants
// -------------------------------------------------
const SOCKET_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";
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

  socket.on("connect", () => console.log(`✅ Connected to ${NAMESPACE} as ${socket!.id}`));
  socket.on("disconnect", (reason) => console.warn(`❌ Disconnected:`, reason));
  socket.on("connect_error", (err) => console.error(`⚠️ Connection error:`, err.message));

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
// Firebase + Socket Integration
// -------------------------------------------------

// Create a room in Firestore AND notify all sockets
export const createRoom = async (room: Omit<Room, "id" | "users">): Promise<void> => {
  try {
    const roomRef = await addDoc(collection(db, "rooms"), {
      ...room,
      users: [],
      createdAt: serverTimestamp(),
    });

    // Emit new room to all connected clients
    socket?.emit("new-room", { id: roomRef.id, ...room, users: [] });
    console.log(`🆕 Room created: ${room.name}`);
  } catch (err) {
    console.error("❌ Error creating room:", err);
  }
};

// Join a room
export const joinRoom = (roomId: string, user: RoomUser["userInfo"]) => {
  socket?.emit("join-room", { roomId, user });
};

// Leave a room
export const leaveRoom = (roomId: string, userId: string) => {
  socket?.emit("leave-room", { roomId, userId });
};

// Listen for live room users updates
export const onRoomUsersUpdate = (callback: (users: RoomUser[]) => void) => {
  socket?.off("room-users").on("room-users", callback);
};

// Listen for live rooms count update (for RoomsPage)
export const onRoomsUserCountUpdate = (
  callback: (data: { roomId: string; count: number }) => void
) => {
  socket?.off("rooms-users-count").on("rooms-users-count", callback);
};

// -------------------------------------------------
// Messaging
// -------------------------------------------------
export const sendRoomMessage = (
  roomId: string,
  text: string,
  userId?: string,
  username?: string
) => {
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

export const onRoomMessage = (callback: (msg: RoomMessage) => void) => {
  socket?.off("receive-message").on("receive-message", (data) => {
    if (data?.message) callback(data.message);
  });
};

// -------------------------------------------------
// Typing Events
// -------------------------------------------------
export const sendTyping = (roomId: string, userId: string) => {
  socket?.emit("typing", { roomId, userId });
};

export const onTyping = (
  callback: (data: { roomId: string; userId: string }) => void
) => {
  socket?.off("typing").on("typing", callback);
};

// -------------------------------------------------
// WebRTC Signaling
// -------------------------------------------------
export const sendRoomOffer = (
  to: string,
  roomId: string,
  offer: RTCSessionDescriptionInit
) => socket?.emit("room-offer", { to, roomId, offer });

export const sendRoomAnswer = (
  to: string,
  roomId: string,
  answer: RTCSessionDescriptionInit
) => socket?.emit("room-answer", { to, roomId, answer });

export const sendRoomIce = (
  to: string,
  roomId: string,
  candidate: RTCIceCandidateInit
) => socket?.emit("room-ice", { to, roomId, candidate });

export const onRoomOffer = (
  callback: (data: { from: string; offer: RTCSessionDescriptionInit }) => void
) => socket?.off("room-offer").on("room-offer", callback);

export const onRoomAnswer = (
  callback: (data: { from: string; answer: RTCSessionDescriptionInit }) => void
) => socket?.off("room-answer").on("room-answer", callback);

export const onRoomIce = (
  callback: (data: { from: string; candidate: RTCIceCandidateInit }) => void
) => socket?.off("room-ice").on("room-ice", callback);

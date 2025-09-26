import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

// ✅ Update to your deployed signaling server or use env variable
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

let socket: Socket | null = null;

/** Connect to the room socket server and return the socket instance */
export const connectRoomSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("✅ Connected to room server:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from room server:", reason);
    });
  }
  return socket;
};

/** Disconnect and clean up the room socket connection */
export const disconnectRoomSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/** Get the active socket instance (may be null if not connected) */
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
  users?: { id: string; userInfo: any }[];
}

/** Create a new room */
export const createRoom = (room: Room): void => {
  socket?.emit("create-room", room);
};

/** Request a list of rooms from the server */
export const listRooms = (): void => {
  socket?.emit("list-rooms");
};

/** Join a room (dynamic) */
export const joinRoom = (roomId: string): void => {
  socket?.emit("join-room-dynamic", { roomId });
};

/** Leave a room */
export const leaveRoom = (roomId: string): void => {
  socket?.emit("leave-room", { roomId });
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

/** Send a text message to a room */
export const sendRoomMessage = (roomId: string, text: string): void => {
  const message: RoomMessage = {
    id: uuidv4(),
    text,
    user: socket?.id,
    timestamp: new Date().toISOString(),
  };
  socket?.emit("room-message", { roomId, ...message });
};

/** Subscribe to incoming room messages */
export const onRoomMessage = (callback: (msg: RoomMessage) => void): void => {
  socket?.off("room-message").on("room-message", callback);
};

// -------------------------------------------------
// 🎥 WebRTC Signaling
// -------------------------------------------------

/** Send WebRTC offer to a peer inside a room */
export const sendRoomOffer = (
  to: string,
  roomId: string,
  offer: RTCSessionDescriptionInit
): void => {
  socket?.emit("room-offer", { to, roomId, offer });
};

/** Send WebRTC answer to a peer inside a room */
export const sendRoomAnswer = (
  to: string,
  roomId: string,
  answer: RTCSessionDescriptionInit
): void => {
  socket?.emit("room-answer", { to, roomId, answer });
};

/** Send ICE candidate to a peer inside a room */
export const sendRoomIce = (
  to: string,
  roomId: string,
  candidate: RTCIceCandidateInit
): void => {
  socket?.emit("room-ice", { to, roomId, candidate });
};

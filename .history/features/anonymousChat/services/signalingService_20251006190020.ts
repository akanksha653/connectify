// src/lib/socketClient.ts
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://connectify-z9gv.onrender.com/";

let socket: Socket | null = null;

export const connectSocket = () => {
  if (socket) return;
  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => console.log("✅ Connected to server:", socket?.id));
  socket.on("disconnect", (reason) => console.log("❌ Disconnected from server:", reason));
  socket.on("connect_error", (err) => console.warn("Socket connect_error:", err));
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
export const getSocketId = () => socket?.id ?? null;

/* Room / matching */
export const startLooking = (userInfo?: any) => socket?.emit("start-looking", userInfo);
export const joinRoom = (roomId: string) => socket?.emit("join-room", roomId);
export const leaveRoom = (roomId: string) => socket?.emit("leave-room", roomId);
export const skipPartner = () => socket?.emit("skip");

/* WebRTC Signaling */
export const sendOffer = (offer: RTCSessionDescriptionInit, roomId: string) =>
  socket?.emit("offer", { offer, roomId });
export const onOffer = (cb: (data: any) => void) => socket?.off("offer").on("offer", cb);
export const sendAnswer = (answer: RTCSessionDescriptionInit, roomId: string) =>
  socket?.emit("answer", { answer, roomId });
export const onAnswer = (cb: (data: any) => void) => socket?.off("answer").on("answer", cb);
export const sendIceCandidate = (candidate: RTCIceCandidateInit, roomId: string) =>
  socket?.emit("ice-candidate", { candidate, roomId });
export const onIceCandidate = (cb: (data: any) => void) =>
  socket?.off("ice-candidate").on("ice-candidate", cb);

/* Messaging */
export interface MessagePayload {
  id?: string;
  sender?: string;
  content: string;
  type?: "text" | "image" | "audio" | "video" | "file";
  timestamp?: string;
  status?: "sent" | "delivered" | "seen";
  reactions?: Record<string, string>;
}

export const sendMessage = (roomId: string, message: MessagePayload) => {
  if (!socket || !roomId || !message) return;
  const msg = {
    id: message.id ?? uuidv4(),
    ...message,
    timestamp: message.timestamp ?? new Date().toISOString(),
    sender: socket.id ?? message.sender,
    status: message.status ?? "sent",
  };
  socket.emit("send-message", { roomId, message: msg });
};

export const onReceiveMessage = (cb: (data: { message: MessagePayload; sender: string }) => void) =>
  socket?.off("receive-message").on("receive-message", cb);

/* Typing */
export const sendTyping = (roomId: string) => socket?.emit("typing", { roomId, sender: socket?.id });
export const onTyping = (cb: ({ sender }: { sender: string }) => void) => socket?.off("typing").on("typing", cb);

/* Message status */
export const sendMessageStatus = (roomId: string, messageId: string, status: "delivered" | "seen") =>
  socket?.emit("message-status", { roomId, messageId, status });
export const onMessageStatusUpdate = (cb: (data: { messageId: string; status: string }) => void) =>
  socket?.off("message-status-update").on("message-status-update", cb);

/* Edit / Delete / React */
export const editMessage = (roomId: string, messageId: string, content: string) =>
  socket?.emit("edit-message", { roomId, messageId, content });
export const onMessageEdited = (cb: (data: any) => void) => socket?.off("message-edited").on("message-edited", cb);

export const deleteMessage = (roomId: string, messageId: string) =>
  socket?.emit("delete-message", { roomId, messageId });
export const onMessageDeleted = (cb: (data: { messageId: string }) => void) =>
  socket?.off("message-deleted").on("message-deleted", cb);

export const reactToMessage = (roomId: string, messageId: string, reaction: string) =>
  socket?.emit("react-message", { roomId, messageId, reaction, user: socket?.id });
export const onMessageReacted = (cb: (data: { messageId: string; reaction: string; user: string }) => void) =>
  socket?.off("message-react").on("message-react", cb);

/* File helper (local blob -> for preview). For production use storage upload returnable URL */
export const sendFile = async (roomId: string, file: File) => {
  if (!file || !roomId) return;
  const url = URL.createObjectURL(file);
  let type: MessagePayload["type"] = "file";
  if (file.type.startsWith("image")) type = "image";
  else if (file.type.startsWith("audio")) type = "audio";
  else if (file.type.startsWith("video")) type = "video";
  sendMessage(roomId, { content: url, type });
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  getSocketId,
  startLooking,
  joinRoom,
  leaveRoom,
  skipPartner,
  sendOffer,
  onOffer,
  sendAnswer,
  onAnswer,
  sendIceCandidate,
  onIceCandidate,
  sendMessage,
  onReceiveMessage,
  sendTyping,
  onTyping,
  sendMessageStatus,
  onMessageStatusUpdate,
  editMessage,
  onMessageEdited,
  deleteMessage,
  onMessageDeleted,
  reactToMessage,
  onMessageReacted,
  sendFile,
};

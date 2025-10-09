// features/anonymousChat/services/signalingService.ts
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://connectify-z9gv.onrender.com";

let socket: Socket | null = null;

/* -------------------------
   Connection lifecycle
-------------------------- */

export const connectSocket = () => {
  if (socket?.connected) return;

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("✅ Signaling connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected from signaling:", reason);
  });

  socket.on("connect_error", (err) => {
    console.warn("⚠️ Socket connect error:", err.message);
  });
};

export const disconnectSocket = () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
};

export const getSocket = () => socket;
export const getSocketId = () => socket?.id ?? null;

/* -------------------------
   Matchmaking helpers
-------------------------- */

export const startLooking = (userInfo?: any) => {
  socket?.emit("start-looking", userInfo || {});
};

export const joinRoom = (roomId: string) => {
  socket?.emit("join-room", roomId);
};

export const leaveRoom = (roomId: string) => {
  if (!socket || !roomId) return;
  socket.emit("leave-room", roomId);
  // Optional: notify frontend to reset local room/messages
};

export const skipPartner = () => {
  socket?.emit("skip");
};

/* -------------------------
   WebRTC signaling
-------------------------- */

export const sendOffer = (offer: RTCSessionDescriptionInit, roomId: string) =>
  socket?.emit("offer", { offer, roomId });

export const onOffer = (
  cb: (data: { offer: RTCSessionDescriptionInit; sender: string }) => void
) => {
  if (!socket) return;
  socket.off("offer");
  socket.on("offer", cb);
};

export const sendAnswer = (answer: RTCSessionDescriptionInit, roomId: string) =>
  socket?.emit("answer", { answer, roomId });

export const onAnswer = (
  cb: (data: { answer: RTCSessionDescriptionInit; sender: string }) => void
) => {
  if (!socket) return;
  socket.off("answer");
  socket.on("answer", cb);
};

export const sendIceCandidate = (candidate: RTCIceCandidateInit, roomId: string) =>
  socket?.emit("ice-candidate", { candidate, roomId });

export const onIceCandidate = (
  cb: (data: { candidate: RTCIceCandidateInit; sender: string }) => void
) => {
  if (!socket) return;
  socket.off("ice-candidate");
  socket.on("ice-candidate", cb);
};

/* -------------------------
   Messaging system
-------------------------- */

export interface MessagePayload {
  id?: string;
  sender: string;
  content: string;
  type?: "text" | "image" | "audio" | "video" | "file";
  timestamp?: string;
  status?: "sent" | "delivered" | "seen";
  reactions?: Record<string, string>;
}

export const sendMessage = ({
  roomId,
  content,
  type = "text",
  id,
  timestamp,
  userId,
}: {
  roomId: string;
  content: string;
  type?: MessagePayload["type"];
  id?: string;
  timestamp?: string;
  userId: string;
}) => {
  if (!socket || !roomId || !content.trim()) return;

  const message: MessagePayload = {
    id: id ?? uuidv4(),
    sender: userId,
    content,
    type,
    timestamp: timestamp ?? new Date().toISOString(),
    status: "sent",
    reactions: {},
  };

  socket.emit("send-message", { ...message, roomId });
  return message;
};

export const onReceiveMessage = (
  cb: (message: MessagePayload, sender: string) => void
) => {
  if (!socket) return;
  socket.off("receive-message");
  socket.on("receive-message", (data: MessagePayload) => {
    cb(data, data.sender);
  });
};

/* -------------------------
   Typing indicator
-------------------------- */

export const sendTyping = (roomId: string, userId: string) => {
  socket?.emit("typing", { roomId, sender: userId });
};

export const onTyping = (cb: ({ sender }: { sender: string }) => void) => {
  if (!socket) return;
  socket.off("typing");
  socket.on("typing", cb);
};

/* -------------------------
   Message status (✔)
-------------------------- */

export const sendSeenStatus = (roomId: string, messageId: string) => {
  socket?.emit("seen-message", { roomId, messageId });
};

export const onMessageStatusUpdate = (
  cb: (data: { messageId: string; status: "delivered" | "seen" }) => void
) => {
  if (!socket) return;
  socket.off("message-status-update");
  socket.on("message-status-update", cb);
};

/* -------------------------
   Edit / Delete / React
-------------------------- */

export const editMessage = (roomId: string, messageId: string, content: string) => {
  socket?.emit("edit-message", { roomId, messageId, content });
};

export const onMessageEdited = (
  cb: (data: { id: string; content: string; edited?: boolean }) => void
) => {
  if (!socket) return;
  socket.off("message-edited");
  socket.on("message-edited", cb);
};

export const deleteMessage = (roomId: string, messageId: string) => {
  socket?.emit("delete-message", { roomId, messageId });
};

export const onMessageDeleted = (cb: (data: { messageId: string }) => void) => {
  if (!socket) return;
  socket.off("message-deleted");
  socket.on("message-deleted", cb);
};

export const reactToMessage = (
  roomId: string,
  messageId: string,
  reaction: string,
  userId: string
) => {
  socket?.emit("react-message", { roomId, messageId, reaction, user: userId });
};

export const onMessageReacted = (
  cb: (data: { messageId: string; reaction: string; user: string }) => void
) => {
  if (!socket) return;
  socket.off("message-react");
  socket.on("message-react", cb);
};

/* -------------------------
   File helper (preview only)
-------------------------- */

export const sendFile = async (roomId: string, file: File, userId: string) => {
  if (!file || !roomId) return;
  const url = URL.createObjectURL(file);
  let type: MessagePayload["type"] = "file";
  if (file.type.startsWith("image")) type = "image";
  else if (file.type.startsWith("audio")) type = "audio";
  else if (file.type.startsWith("video")) type = "video";

  return sendMessage({ roomId, content: url, type, userId });
};

/* -------------------------
   Default export
-------------------------- */
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
  sendSeenStatus,
  onMessageStatusUpdate,
  editMessage,
  onMessageEdited,
  deleteMessage,
  onMessageDeleted,
  reactToMessage,
  onMessageReacted,
  sendFile,
};

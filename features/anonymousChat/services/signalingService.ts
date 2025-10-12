// features/anonymousChat/services/signalingService.ts
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://connectify-z9gv.onrender.com";

let socket: Socket | null = null;

/* -------------------------
   Types
------------------------- */
export interface MessagePayload {
  id: string;
  sender?: string;
  content: string; // text or file URL
  type?: "text" | "image" | "audio" | "video" | "file";
  timestamp: string;
  status: "sent" | "delivered" | "seen";
  reactions: Record<string, string>;
}

/* -------------------------
   Connection & lifecycle
------------------------- */
export const connectSocket = (): void => {
  if (socket) return;

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => console.log("✅ Signaling connected:", socket?.id));
  socket.on("disconnect", (reason) =>
    console.log("❌ Signaling disconnected:", reason)
  );
  socket.on("connect_error", (err) =>
    console.warn("⚠️ Signaling connect error:", err)
  );
};

export const disconnectSocket = (): void => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
};

export const getSocket = (): Socket | null => socket;
export const getSocketId = (): string | null => socket?.id ?? null;

/* -------------------------
   Room / matchmaking
------------------------- */
export const startLooking = (userInfo?: Record<string, any>): void => {
  socket?.emit("start-looking", userInfo ?? {});
};

export const joinRoom = (roomId: string): void => {
  socket?.emit("join-room", roomId);
};

export const leaveRoom = (roomId: string): void => {
  socket?.emit("leave-room", roomId);
};

export const skipPartner = (): void => {
  socket?.emit("skip");
};

/* -------------------------
   WebRTC signaling
------------------------- */
export const sendOffer = (offer: RTCSessionDescriptionInit, roomId: string) =>
  socket?.emit("offer", { offer, roomId });

export const onOffer = (
  cb: (data: { offer: RTCSessionDescriptionInit; sender: string }) => void
) => {
  socket?.off("offer").on("offer", cb);
};

export const sendAnswer = (answer: RTCSessionDescriptionInit, roomId: string) =>
  socket?.emit("answer", { answer, roomId });

export const onAnswer = (
  cb: (data: { answer: RTCSessionDescriptionInit; sender: string }) => void
) => {
  socket?.off("answer").on("answer", cb);
};

export const sendIceCandidate = (
  candidate: RTCIceCandidateInit,
  roomId: string
) => socket?.emit("ice-candidate", { candidate, roomId });

export const onIceCandidate = (
  cb: (data: { candidate: RTCIceCandidateInit; sender: string }) => void
) => socket?.off("ice-candidate").on("ice-candidate", cb);

/* -------------------------
   Messaging API
------------------------- */
export const sendMessage = ({
  roomId,
  content,
  type = "text",
  id,
  timestamp,
}: {
  roomId: string;
  content: string;
  type?: MessagePayload["type"];
  id?: string;
  timestamp?: string;
}): void => {
  if (!socket || !roomId || !content) return;

  const message: MessagePayload = {
    id: id ?? uuidv4(),
    content,
    type,
    timestamp: timestamp ?? new Date().toISOString(),
    status: "sent",
    sender: socket.id ?? undefined,
    reactions: {},
  };

  socket.emit("send-message", { roomId, message });
};

export const onReceiveMessage = (
  cb: (data: { message: MessagePayload; sender: string }) => void
) => socket?.off("receive-message").on("receive-message", cb);

/* -------------------------
   Typing indicator
------------------------- */
export const sendTyping = (roomId: string): void => {
  if (!socket || !roomId) return;
  socket.emit("typing", { roomId, sender: socket.id });
};

export const onTyping = (
  cb: (data: { sender: string }) => void
) => socket?.off("typing").on("typing", cb);

/* -------------------------
   Message status
------------------------- */
export const sendMessageStatus = (
  roomId: string,
  messageId: string,
  status: "delivered" | "seen"
): void => {
  if (!socket) return;
  socket.emit("message-status", { roomId, messageId, status });
};

export const onMessageStatusUpdate = (
  cb: (data: { messageId: string; status: string }) => void
) => socket?.off("message-status-update").on("message-status-update", cb);

/* -------------------------
   Edit / Delete / React
------------------------- */
export const editMessage = (roomId: string, messageId: string, content: string) =>
  socket?.emit("edit-message", { roomId, messageId, content });

export const onMessageEdited = (
  cb: (data: { messageId: string; content: string; sender?: string }) => void
) => socket?.off("message-edited").on("message-edited", cb);

export const deleteMessage = (roomId: string, messageId: string) =>
  socket?.emit("delete-message", { roomId, messageId });

export const onMessageDeleted = (cb: (data: { messageId: string }) => void) =>
  socket?.off("message-deleted").on("message-deleted", cb);

export const reactToMessage = (
  roomId: string,
  messageId: string,
  reaction: string
) =>
  socket?.emit("react-message", {
    roomId,
    messageId,
    reaction,
    user: socket?.id,
  });

export const onMessageReacted = (
  cb: (data: { messageId: string; reaction: string; user: string }) => void
) => socket?.off("message-react").on("message-react", cb);

/* -------------------------
   File helper
------------------------- */
export const sendFile = async (roomId: string, file: File): Promise<void> => {
  if (!file || !roomId) return;

  const url = URL.createObjectURL(file);
  let type: MessagePayload["type"] = "file";

  if (file.type.startsWith("image")) type = "image";
  else if (file.type.startsWith("audio")) type = "audio";
  else if (file.type.startsWith("video")) type = "video";

  sendMessage({ roomId, content: url, type });
};

/* -------------------------
   Default export
------------------------- */
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

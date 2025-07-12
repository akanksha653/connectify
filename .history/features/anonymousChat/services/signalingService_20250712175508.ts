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

export const startLooking = () => {
  socket?.emit("start-looking");
};

export const joinRoom = (roomId: string) => {
  socket?.emit("join-room", roomId);
};

export const leaveRoom = (roomId: string) => {
  socket?.emit("leave-room", roomId);
};

export const skipPartner = () => {
  socket?.emit("skip");
};

// WebRTC events
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

// Messaging
export const sendMessage = ({
  roomId,
  content,
  type = "text"
}: {
  roomId: string;
  content: string;
  type?: "text" | "image" | "audio" | "video";
}) => {
  const message = {
    id: uuidv4(),
    content,
    type,
    timestamp: new Date().toISOString(),
    status: "sent",
    sender: socket?.id,
  };
  socket?.emit("send-message", { roomId, message });
};

export const onReceiveMessage = (
  callback: (data: { message: any; sender: string }) => void
) => {
  socket?.on("receive-message", callback);
};

// Typing
export const sendTyping = (roomId: string) => {
  socket?.emit("typing", { roomId, sender: socket?.id });
};

export const onTyping = (callback: ({ sender }: { sender: string }) => void) => {
  socket?.on("typing", callback);
};

// Message Status
export const sendMessageStatus = ({
  roomId,
  messageId,
  status,
}: {
  roomId: string;
  messageId: string;
  status: "delivered" | "seen";
}) => {
  socket?.emit("message-status", { roomId, messageId, status });
};

export const onMessageStatusUpdate = (
  callback: ({ messageId, status }: { messageId: string; status: string }) => void
) => {
  socket?.on("message-status-update", callback);
};

// Delete/Edit/React
export const deleteMessage = (roomId: string, messageId: string) => {
  socket?.emit("delete-message", { roomId, messageId });
};

export const onMessageDeleted = (callback: ({ messageId }: { messageId: string }) => void) => {
  socket?.on("message-deleted", callback);
};

export const editMessage = (roomId: string, messageId: string, content: string) => {
  socket?.emit("edit-message", { roomId, messageId, content });
};

export const reactToMessage = (roomId: string, messageId: string, reaction: string) => {
  socket?.emit("react-message", { roomId, messageId, reaction, user: socket?.id });
};

export const onMessageReacted = (
  callback: ({ messageId, reaction, user }: { messageId: string; reaction: string; user: string }) => void
) => {
  socket?.on("message-react", callback);
};

export default {
  connectSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  startLooking,
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
  deleteMessage,
  onMessageDeleted,
  editMessage,
  reactToMessage,
  onMessageReacted,
};

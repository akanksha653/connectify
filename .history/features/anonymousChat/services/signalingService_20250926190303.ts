import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://connectify-z9gv.onrender.com/";

let socket: Socket | null = null;

// --- CONNECTION ---
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
      console.log("✅ Joined room:", roomId);
    });
  }
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
export const getSocketId = () => socket?.id ?? null;

// --- ROOM SYSTEM ---
export const createRoom = (roomData: {
  name: string;
  topic: string;
  description?: string;
  password?: string;
}) => {
  const room = { id: uuidv4(), ...roomData, userCount: 0 };
  socket?.emit("create-room", room);
};

export const listRooms = () => {
  socket?.emit("list-rooms");
};

export const joinRoom = (roomId: string) => {
  socket?.emit("join-room", roomId);
};

export const leaveRoom = (roomId: string) => {
  socket?.emit("leave-room", roomId);
};

// --- 1-1 ANONYMOUS CHAT ---
export const startLooking = (userInfo?: any) => {
  socket?.emit("start-looking", userInfo);
};

export const skipPartner = () => {
  socket?.emit("skip");
};

// --- WEBRTC SIGNALING ---
export const sendOffer = (offer: RTCSessionDescriptionInit, roomId: string) => {
  socket?.emit("offer", { offer, roomId });
};

export const onOffer = (callback: (data: { offer: RTCSessionDescriptionInit; sender: string }) => void) => {
  socket?.off("offer").on("offer", callback);
};

export const sendAnswer = (answer: RTCSessionDescriptionInit, roomId: string) => {
  socket?.emit("answer", { answer, roomId });
};

export const onAnswer = (callback: (data: { answer: RTCSessionDescriptionInit; sender: string }) => void) => {
  socket?.off("answer").on("answer", callback);
};

export const sendIceCandidate = (candidate: RTCIceCandidateInit, roomId: string) => {
  socket?.emit("ice-candidate", { candidate, roomId });
};

export const onIceCandidate = (callback: (data: { candidate: RTCIceCandidateInit; sender: string }) => void) => {
  socket?.off("ice-candidate").on("ice-candidate", callback);
};

// --- MESSAGING ---
export const sendMessage = ({
  roomId,
  content,
  type = "text",
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
  socket?.off("receive-message").on("receive-message", callback);
};

// --- TYPING INDICATOR ---
export const sendTyping = (roomId: string) => {
  socket?.emit("typing", { roomId, sender: socket?.id });
};

export const onTyping = (callback: ({ sender, roomId }: { sender: string; roomId: string }) => void) => {
  socket?.off("typing").on("typing", callback);
};

// --- MESSAGE STATUS ---
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
  callback: ({ messageId, status, roomId }: { messageId: string; status: string; roomId: string }) => void
) => {
  socket?.off("message-status-update").on("message-status-update", callback);
};

// --- DELETE / EDIT / REACT ---
export const deleteMessage = (roomId: string, messageId: string) => {
  socket?.emit("delete-message", { roomId, messageId });
};

export const onMessageDeleted = (callback: ({ messageId, roomId }: { messageId: string; roomId: string }) => void) => {
  socket?.off("message-deleted").on("message-deleted", callback);
};

export const editMessage = (roomId: string, messageId: string, content: string) => {
  socket?.emit("edit-message", { roomId, messageId, content });
};

export const reactToMessage = (roomId: string, messageId: string, reaction: string) => {
  socket?.emit("react-message", { roomId, messageId, reaction, user: socket?.id });
};

export const onMessageReacted = (
  callback: ({ messageId, reaction, user, roomId }: { messageId: string; reaction: string; user: string; roomId: string }) => void
) => {
  socket?.off("message-react").on("message-react", callback);
};

// --- EXPORT ---
export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  getSocketId,
  startLooking,
  joinRoom,
  leaveRoom,
  skipPartner,
  createRoom,
  listRooms,
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

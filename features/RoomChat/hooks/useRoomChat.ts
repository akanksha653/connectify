// features/RoomSystem/hooks/useRoomChat.ts
import { useEffect, useState } from "react";
import type { Message } from "../utils/roomTypes";
import { useRoomSocket } from "./useRoomSocket";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseConfig"; // Firebase storage instance

export function useRoomChat(roomId: string) {
  const { socket, sendMessage } = useRoomSocket(); // ✅ socket and sendMessage are available now
  const [messages, setMessages] = useState<Message[]>([]);

  // Listen to incoming messages
  useEffect(() => {
    if (!socket) return;

    const recv = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("receive-message", recv);

    return () => {
      socket.off("receive-message", recv);
    };
  }, [socket]);

  // Send text message
  const send = (payload: Omit<Message, "id" | "timestamp">) => {
    const msg: Partial<Message> = { ...payload, timestamp: Date.now() };
    sendMessage(roomId, msg);
    setMessages((prev) => [...prev, { ...(msg as Message), id: `local-${Date.now()}` }]);
  };

  // Send file message
  const sendFile = async (file: File, senderName: string) => {
    const storageRef = ref(storage, `rooms/${roomId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    send({
      senderId: "me",
      senderName,
      content: url,
      type: "file",
      fileName: file.name,
    });
  };

  return { messages, send, sendFile };
}

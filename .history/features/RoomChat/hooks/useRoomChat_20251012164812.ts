// features/RoomSystem/hooks/useRoomChat.ts
import { useEffect, useState, useRef } from "react";
import type { Message } from "../utils/roomTypes";
import { useRoomSocket } from "./useRoomSocket";
import { collection, query, orderBy, limit as fLimit, startAfter, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig"; // adapt path if needed

export function useRoomChat(roomId: string | null) {
  const { sendMessage, loadMessages, on, socket } = useRoomSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const lastDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const recv = (msg: Message) => {
      if (msg && msg.id) setMessages((m) => [...m, msg]);
    };

    socket.on("receive-message", recv);

    return () => {
      socket.off("receive-message", recv);
    };
  }, [socket]);

  useEffect(() => {
    setMessages([]);
    lastDocIdRef.current = null;
    if (!roomId) return;

    // load first page via socket fallback
    socket?.emit("load-messages", { roomId, limit: 50, lastMessageId: null });
    const handler = (msgs: Message[]) => {
      setMessages(msgs || []);
      if (msgs && msgs.length) lastDocIdRef.current = msgs[msgs.length - 1].id;
    };
    socket?.on("messages", handler);
    return () => {
      socket?.off("messages", handler);
    };
  }, [roomId, socket]);

  const send = (payload: Omit<Message, "id" | "timestamp">) => {
    if (!roomId) return;
    const msg: Partial<Message> = {
      ...payload,
      timestamp: Date.now(),
    };
    sendMessage(roomId, msg);
    // optimistic local add (without id) — the server will emit receive-message with id
    setMessages((m) => [...m, { ...(msg as Message), id: `local-${Date.now()}` }]);
  };

  const loadMore = async (pageSize = 50) => {
    if (!roomId) return;

    // Prefer server socket pagination because messages are stored in subcollection.
    socket?.emit("load-messages", { roomId, limit: pageSize, lastMessageId: lastDocIdRef.current });
  };

  return {
    messages,
    send,
    loadMore,
  };
}

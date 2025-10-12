import { useEffect, useState, useCallback, useRef } from "react";
import type { Socket } from "socket.io-client";
import {
  connectRoomSocket,
  disconnectRoomSocket,
  joinRoom,
  leaveRoom,
  sendRoomMessage,
  sendTyping,
  onRoomMessage,
  onTyping,
} from "../../../features/RoomChat/services/roomSocketService";

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

/**
 * ✅ Robust Hook to manage the /rooms socket namespace
 * Handles: connection, reconnection, room events, messaging, typing
 */
export default function useRoomSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  const messageCallbacks = useRef<((msg: RoomMessage) => void)[]>([]);
  const typingCallbacks = useRef<((data: { roomId: string; userId: string }) => void)[]>([]);
  const subscribed = useRef(false);

  // --------------------------------------------------------------------
  // 🔌 Connect + Sync
  // --------------------------------------------------------------------
  useEffect(() => {
    const s = connectRoomSocket();
    setSocket(s);

    // --- Room events ---
    const handleRoomsList = (data: Room[]) => setRooms(data);

    const handleRoomCreated = (newRoom: Room) =>
      setRooms((prev) => {
        const exists = prev.some((r) => r.id === newRoom.id);
        return exists ? prev : [...prev, { ...newRoom, users: [] }];
      });

    const handleRoomUpdate = (updatedRoom: Room) =>
      setRooms((prev) =>
        prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
      );

    s.on("rooms", handleRoomsList);
    s.on("room-created", handleRoomCreated);
    s.on("room-update", handleRoomUpdate);

    // --- Messages & typing (subscribe only once) ---
    if (!subscribed.current) {
      onRoomMessage((msg) => messageCallbacks.current.forEach((cb) => cb(msg)));
      onTyping((data) => typingCallbacks.current.forEach((cb) => cb(data)));
      subscribed.current = true;
    }

    // --- Cleanup ---
    return () => {
      s.off("rooms", handleRoomsList);
      s.off("room-created", handleRoomCreated);
      s.off("room-update", handleRoomUpdate);
      disconnectRoomSocket();
      setSocket(null);

      messageCallbacks.current = [];
      typingCallbacks.current = [];
    };
  }, []);

  // --------------------------------------------------------------------
  // 🧩 Public API
  // --------------------------------------------------------------------
  const createRoom = useCallback(
    (room: Omit<Room, "id" | "users">) => {
      if (!socket) return console.warn("Socket not connected yet");
      socket.emit("create-room", room);
    },
    [socket]
  );

  const join = useCallback(
    (roomId: string, user: RoomUser["userInfo"]) => {
      if (!socket) return console.warn("Socket not connected yet");
      joinRoom(roomId, user);
    },
    [socket]
  );

  const leave = useCallback(
    (roomId: string, userId: string) => {
      if (!socket) return console.warn("Socket not connected yet");
      leaveRoom(roomId, userId);
    },
    [socket]
  );

  const sendMessage = useCallback(
    (roomId: string, text: string) => {
      if (!socket) return console.warn("Socket not connected yet");
      if (text.trim()) sendRoomMessage(roomId, text);
    },
    [socket]
  );

  const typing = useCallback(
    (roomId: string, userId: string) => {
      if (!socket) return console.warn("Socket not connected yet");
      sendTyping(roomId, userId);
    },
    [socket]
  );

  // --------------------------------------------------------------------
  // 💬 Event Subscription Helpers
  // --------------------------------------------------------------------
  const onMessage = useCallback((callback: (msg: RoomMessage) => void) => {
    messageCallbacks.current.push(callback);
    return () => {
      messageCallbacks.current = messageCallbacks.current.filter((cb) => cb !== callback);
    };
  }, []);

  const onUserTyping = useCallback(
    (callback: (data: { roomId: string; userId: string }) => void) => {
      typingCallbacks.current.push(callback);
      return () => {
        typingCallbacks.current = typingCallbacks.current.filter((cb) => cb !== callback);
      };
    },
    []
  );

  // --------------------------------------------------------------------
  // ✅ Return API
  // --------------------------------------------------------------------
  return {
    socket,
    rooms,
    createRoom,
    join,
    leave,
    sendMessage,
    typing,
    onMessage,
    onUserTyping,
  };
}

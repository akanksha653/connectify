// features/RoomChat/hooks/useRoomSocket.ts
import { useEffect, useState, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { ROOM_EVENTS } from "../utils/roomEvents";
import type { Room, Participant, Message } from "../utils/roomTypes";

const SIGNALING_URL = (process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001").replace(/\/$/, "");

export function useRoomSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomUsers, setCurrentRoomUsers] = useState<Participant[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // Store WebRTC handler
  const _handleUserJoined = useRef<((data: { socketId: string }) => void) | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      const s = io(ROOM_SERVER_URL, {
        transports: ["websocket", "polling"],
      });
      socketRef.current = s;
      setSocket(s);

      s.on("connect", () => setConnected(true));
      s.on("disconnect", () => setConnected(false));

      // Listen for rooms list
      s.on("rooms", (r: Room[]) => setRooms(r));

      // Listen for current room users
      s.on("room-users", (users: Participant[]) => setCurrentRoomUsers(users));
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const joinRoom = (roomId: string, user: any) => {
    socketRef.current?.emit(ROOM_EVENTS.JOIN, { roomId, user });
  };

  const leaveRoom = (roomId: string) => {
    socketRef.current?.emit(ROOM_EVENTS.LEAVE, { roomId });
    setCurrentRoomUsers([]);
  };

  const sendMessage = (roomId: string, message: Partial<Message>) => {
    socketRef.current?.emit(ROOM_EVENTS.MESSAGE_SEND, { roomId, message });
  };

  const createRoom = (payload: { name: string; topic: string }) => {
    socketRef.current?.emit(ROOM_EVENTS.CREATE, payload);
  };

  // --- WebRTC integration helper ---
  const onUserJoined = (handler: (data: { socketId: string }) => void) => {
    if (!socketRef.current) return;

    // Remove previous listener if exists
    if (_handleUserJoined.current) {
      socketRef.current.off("user-joined", _handleUserJoined.current);
    }

    _handleUserJoined.current = handler;
    socketRef.current.on("user-joined", handler);
  };

  const removeUserJoinedListener = () => {
    if (!socketRef.current || !_handleUserJoined.current) return;
    socketRef.current.off("user-joined", _handleUserJoined.current);
    _handleUserJoined.current = null;
  };

  return useMemo(
    () => ({
      socket,
      connected,
      rooms,
      currentRoomUsers,
      joinRoom,
      leaveRoom,
      sendMessage,
      createRoom,
      onUserJoined,
      removeUserJoinedListener,
    }),
    [socket, connected, rooms, currentRoomUsers]
  );
}

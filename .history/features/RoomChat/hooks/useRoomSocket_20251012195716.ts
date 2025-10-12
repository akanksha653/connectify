import { useEffect, useState, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { ROOM_EVENTS } from "../utils/roomEvents";
import type { Room, Participant, Message } from "../utils/roomTypes";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const ROOM_SERVER_URL =
  (process.env.NEXT_PUBLIC_ROOM_SERVER_URL?.replace(/\/$/, "") || "http://localhost:3001") +
  "/rooms";

export function useRoomSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomUsers, setCurrentRoomUsers] = useState<Participant[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const _handleUserJoined = useRef<((data: { socketId: string }) => void) | null>(null);

  // Firestore rooms listener
  useEffect(() => {
    const roomsCol = collection(db, "rooms");
    const unsubscribe = onSnapshot(roomsCol, (snapshot) => {
      const fetchedRooms: Room[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Room[];
      setRooms(fetchedRooms);
    });
    return () => unsubscribe();
  }, []);

  // Socket connection
  useEffect(() => {
    if (!socketRef.current) {
      const s = io(ROOM_SERVER_URL, { transports: ["websocket", "polling"] });
      socketRef.current = s;
      setSocket(s);

      s.on("connect", () => setConnected(true));
      s.on("disconnect", () => setConnected(false));

      s.on("room-users", (users: Participant[]) => setCurrentRoomUsers(users));
      s.on("user-joined", ({ socketId, userInfo }) =>
        setCurrentRoomUsers((prev) => [...prev.filter((u) => u.socketId !== socketId), { socketId, userInfo }])
      );
      s.on("user-left", ({ userId }) =>
        setCurrentRoomUsers((prev) => prev.filter((u) => u.socketId !== userId))
      );

      s.on("room-created", (newRoom: Room) => setRooms((prev) => [...prev, newRoom]));
      s.on("room-deleted", ({ roomId }: { roomId: string }) =>
        setRooms((prev) => prev.filter((r) => r.id !== roomId))
      );
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // --- Room actions ---

  const createRoom = async (payload: { name: string; topic: string; description?: string; password?: string }) => {
    try {
      const roomsCol = collection(db, "rooms");
      const newRoomRef = await addDoc(roomsCol, {
        name: payload.name,
        topic: payload.topic,
        description: payload.description || "",
        password: payload.password || null,
        createdAt: serverTimestamp(),
        users: [],
      });

      const newRoom: Room = { id: newRoomRef.id, name: payload.name, topic: payload.topic, users: [] };
      socketRef.current?.emit(ROOM_EVENTS.CREATE, newRoom);
      return newRoom;
    } catch (err) {
      console.error("createRoom error:", err);
      return null;
    }
  };

  const joinRoom = async (roomId: string, user: Participant) => {
    if (!socketRef.current) return;

    // Ensure socketId is attached
    const userWithSocket: Participant = {
      ...user,
      socketId: socketRef.current.id,
    };

    socketRef.current.emit(ROOM_EVENTS.JOIN, { roomId, user: userWithSocket });

    try {
      const roomDoc = doc(db, "rooms", roomId);
      await updateDoc(roomDoc, { users: arrayUnion(userWithSocket) });
    } catch (err) {
      console.error("joinRoom error:", err);
    }
  };

  const leaveRoom = async (roomId: string, user: Participant) => {
    if (!socketRef.current) return;

    const userWithSocket = { ...user, socketId: socketRef.current.id };
    socketRef.current.emit(ROOM_EVENTS.LEAVE, { roomId });
    setCurrentRoomUsers([]);

    try {
      const roomDoc = doc(db, "rooms", roomId);
      await updateDoc(roomDoc, { users: arrayRemove(userWithSocket) });
    } catch (err) {
      console.error("leaveRoom error:", err);
    }
  };

  const deleteRoom = async (roomId: string) => {
    try {
      await deleteDoc(doc(db, "rooms", roomId));
      socketRef.current?.emit(ROOM_EVENTS.DELETE, { roomId });
    } catch (err) {
      console.error("deleteRoom error:", err);
    }
  };

  const sendMessage = (roomId: string, message: Partial<Message>) => {
    socketRef.current?.emit(ROOM_EVENTS.MESSAGE_SEND, { roomId, message });
  };

  // WebRTC helpers
  const onUserJoined = (handler: (data: { socketId: string }) => void) => {
    if (!socketRef.current) return;

    if (_handleUserJoined.current) socketRef.current.off("user-joined", _handleUserJoined.current);

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
      deleteRoom,
      onUserJoined,
      removeUserJoinedListener,
    }),
    [socket, connected, rooms, currentRoomUsers]
  );
}

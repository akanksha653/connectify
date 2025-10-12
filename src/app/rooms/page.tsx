"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { connectRoomSocket, createRoom as createRoomSocket } from "../../../features/RoomChat/services/roomSocketService";

interface UserInfo {
  name?: string;
  age?: string;
  gender?: string;
  country?: string;
}

interface Room {
  id: string;
  name: string;
  topic: string;
  description?: string;
  users: { socketId: string; userInfo: UserInfo }[];
  hasPassword: boolean;
  password?: string | null;
  createdAt?: any;
}

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    topic: "",
    description: "",
    password: "",
  });

  const roomsCollection = useMemo(() => collection(db, "rooms"), []);
  const socket = useMemo(() => connectRoomSocket(), []);

  // -------------------------
  // Load rooms from Firestore + Socket
  // -------------------------
  useEffect(() => {
    const q = query(roomsCollection, orderBy("createdAt", "desc"));
    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const fetchedRooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];
      setRooms(fetchedRooms);
    });

    // Dynamic room updates from socket
    socket.on("new-room", (room: Room) => {
      setRooms((prev) => [room, ...prev]);
    });

    // Update users count dynamically
    socket.on("rooms-users-count", ({ roomId, count }: { roomId: string; count: number }) => {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, users: new Array(count).fill({}) } : r
        )
      );
    });

    socket.on("connected", () => console.log("🟢 Room socket connected"));
    socket.on("disconnect", (reason) => console.warn("🔴 Disconnected:", reason));

    return () => {
      unsubscribeFirestore();
      socket.off("new-room");
      socket.off("rooms-users-count");
      socket.off("connected");
      socket.off("disconnect");
    };
  }, [roomsCollection, socket]);

  // -------------------------
  // Create Room
  // -------------------------
  const handleCreateRoom = useCallback(async () => {
    if (!form.name.trim() || !form.topic.trim()) {
      alert("Room name and topic are required");
      return;
    }

    setIsCreating(true);

    const newRoom = {
      name: form.name.trim(),
      topic: form.topic.trim(),
      description: form.description.trim(),
      hasPassword: !!form.password,
      password: form.password || null,
    };

    try {
      await createRoomSocket(newRoom); // <- Firebase + Socket handled inside
      setForm({ name: "", topic: "", description: "", password: "" });
      setShowModal(false);
      setToast("Room created successfully!");
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error("❌ Error creating room:", err);
      alert("Failed to create room. Try again.");
    } finally {
      setIsCreating(false);
    }
  }, [form]);

  // -------------------------
  // Join Room
  // -------------------------
  const handleJoinRoom = useCallback(
    (room: Room) => {
      if (room.hasPassword) {
        const pass = prompt("Enter room password:");
        if (!pass || pass !== room.password) {
          alert("Incorrect password");
          return;
        }
      }

      const userInfoStr = localStorage.getItem("user-info");
      let userInfo: UserInfo = userInfoStr
        ? JSON.parse(userInfoStr)
        : {
            name: "Guest " + Math.floor(Math.random() * 1000),
            gender: "Unknown",
            country: "Unknown",
            age: "N/A",
          };

      localStorage.setItem("user-info", JSON.stringify(userInfo));
      router.push(`/rooms/${room.id}`);
    },
    [router]
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white">👥 Join a Room</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-colors"
          >
            ➕ Create Room
          </button>
        </div>

        {/* Rooms List */}
        <AnimatePresence mode="popLayout">
          {rooms.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-neutral-600 dark:text-neutral-300">
              No rooms available. Create one to get started!
            </motion.p>
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map((room) => (
                <motion.div key={room.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-neutral-900 p-5 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">{room.name}</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">Topic: {room.topic}</p>
                    {room.description && <p className="text-xs mt-2 text-neutral-500 dark:text-neutral-400 line-clamp-2">{room.description}</p>}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {room.users?.length || 0} {room.users?.length === 1 ? "user" : "users"}
                    </span>
                    <button onClick={() => handleJoinRoom(room)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm shadow-sm transition-colors">
                      Join{room.hasPassword ? " 🔒" : ""}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal + Toast... (same as before) */}
    </main>
  );
}

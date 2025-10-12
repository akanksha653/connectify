"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebaseConfig";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { connectRoomSocket } from "@/features/RoomChat/services/roomSocketService";

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

    socket.on("rooms", (updatedRooms: Room[]) => setRooms(updatedRooms));
    socket.on("connected", () => console.log("🟢 Room socket connected"));

    return () => {
      unsubscribeFirestore();
      socket.off("rooms");
      socket.off("connected");
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
      socket.emit("create-room", newRoom);
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
  }, [form, socket]);

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

      socket.emit("join-room", { roomId: room.id, user: userInfo });
      window.location.href = `/rooms/${room.id}`;
    },
    [socket]
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white">
            👥 Join a Room
          </h1>
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
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-neutral-600 dark:text-neutral-300"
            >
              No rooms available. Create one to get started!
            </motion.p>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {rooms.map((room) => (
                <motion.div
                  key={room.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-neutral-900 p-5 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">
                      {room.name}
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                      Topic: {room.topic}
                    </p>
                    {room.description && (
                      <p className="text-xs mt-2 text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {room.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {room.users?.length || 0}{" "}
                      {room.users?.length === 1 ? "user" : "users"}
                    </span>
                    <button
                      onClick={() => handleJoinRoom(room)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm shadow-sm transition-colors"
                    >
                      Join{room.hasPassword ? " 🔒" : ""}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-xl w-full max-w-md"
            >
              <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">
                Create a Room
              </h2>
              {["name", "topic", "description", "password"].map((field) => (
                <input
                  key={field}
                  type={field === "password" ? "password" : "text"}
                  placeholder={
                    field === "description"
                      ? "Description (optional)"
                      : field === "password"
                      ? "Password (optional)"
                      : `Room ${field[0].toUpperCase() + field.slice(1)}`
                  }
                  className="input-field mb-3 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-neutral-700 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={(form as any)[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              ))}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-neutral-300 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-md"
                >
                  Cancel
                </button>
                <button
                  disabled={isCreating}
                  onClick={handleCreateRoom}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-md transition-colors disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-md shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

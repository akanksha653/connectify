"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
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
  const [form, setForm] = useState({
    name: "",
    topic: "",
    description: "",
    password: "",
  });

  const roomsCollection = collection(db, "rooms");
  const socket = connectRoomSocket();

  // -------------------------
  // Load rooms from Firestore in real-time
  // -------------------------
  useEffect(() => {
    const q = query(roomsCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRooms: Room[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];
      setRooms(fetchedRooms);
    });
    return () => unsubscribe();
  }, []);

  // -------------------------
  // Create Room (via signaling + Firestore)
  // -------------------------
  const handleCreateRoom = useCallback(async () => {
    if (!form.name.trim() || !form.topic.trim()) {
      alert("Room name and topic are required");
      return;
    }

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
    } catch (err) {
      console.error("❌ Error creating room:", err);
      alert("Failed to create room. Try again.");
    }
  }, [form, socket]);

  // -------------------------
  // Join Room
  // -------------------------
  const handleJoinRoom = (room: Room) => {
    if (room.hasPassword) {
      const pass = prompt("Enter room password:");
      if (!pass || pass !== room.password) {
        alert("Incorrect password");
        return;
      }
    }

    // Get user info from localStorage (from pre-chat form)
    const userInfoStr = localStorage.getItem("userInfo");
    let userInfo: UserInfo = {};
    if (userInfoStr) {
      userInfo = JSON.parse(userInfoStr);
    } else {
      userInfo = {
        name: "Guest " + Math.floor(Math.random() * 1000),
        gender: "Unknown",
        country: "Unknown",
        age: "N/A",
      };
    }

    // Tell server you joined
    socket.emit("join-room", { roomId: room.id, user: userInfo });

    // Navigate to room
    window.location.href = `/rooms/${room.id}`;
  };

  // -------------------------
  // Sync latest room list from socket
  // -------------------------
  useEffect(() => {
    if (!socket) return;

    socket.on("rooms", (updatedRooms: Room[]) => {
      setRooms(updatedRooms);
    });

    return () => {
      socket.off("rooms");
    };
  }, [socket]);

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
        {rooms.length === 0 ? (
          <p className="text-center text-neutral-600 dark:text-neutral-300">
            No rooms available. Create one to get started!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 p-5 rounded-xl shadow-md flex flex-col justify-between border border-neutral-200 dark:border-neutral-800"
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
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">
              Create a Room
            </h2>
            <input
              type="text"
              placeholder="Room Name"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Topic"
              className="input-field"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
            <textarea
              placeholder="Description (optional)"
              className="input-field resize-none"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Password (optional)"
              className="input-field mb-4"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-neutral-300 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-md transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

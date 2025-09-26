"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";

type Room = {
  id: string;
  name: string;
  topic: string;
  description: string;
  userCount: number;
  hasPassword: boolean;
};

let socket: Socket | null = null;

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    topic: "",
    description: "",
    password: "",
  });

  useEffect(() => {
    // Connect to your signaling server (adjust URL if needed)
    socket = io(process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001", {
      transports: ["websocket"],
    });

    socket.emit("list-rooms");

    socket.on("rooms", (data: Room[]) => setRooms(data));

    socket.on("room-created", (newRoom: Room) => {
      setRooms((prev) => [...prev, newRoom]);
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    if (!form.name || !form.topic) {
      alert("Room name and topic are required");
      return;
    }
    socket?.emit("create-room", {
      ...form,
      password: form.password || null,
    });
    setForm({ name: "", topic: "", description: "", password: "" });
    setShowModal(false);
  };

  const handleJoinRoom = (room: Room) => {
    if (room.hasPassword) {
      const pass = prompt("Enter room password");
      if (!pass) return;
      socket?.emit("join-room", { roomId: room.id, password: pass });
    } else {
      socket?.emit("join-room", { roomId: room.id });
    }
    // Redirect to dedicated room page
    window.location.href = `/rooms/${room.id}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white">
            👥 Join a Room
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md"
          >
            ➕ Create Room
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-center text-neutral-600 dark:text-neutral-300">
            No rooms available. Create one to get started!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 p-4 rounded-xl shadow-md flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {room.name}
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Topic: {room.topic}
                  </p>
                  <p className="text-xs mt-1 text-neutral-500 dark:text-neutral-400 line-clamp-2">
                    {room.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    {room.userCount} {room.userCount === 1 ? "user" : "users"}
                  </span>
                  <button
                    onClick={() => handleJoinRoom(room)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm shadow-sm"
                  >
                    Join
                    {room.hasPassword ? " 🔒" : ""}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">
              Create a Room
            </h2>
            <input
              type="text"
              placeholder="Room Name"
              className="w-full mb-3 px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Topic"
              className="w-full mb-3 px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
            <textarea
              placeholder="Description (optional)"
              className="w-full mb-3 px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password (optional)"
              className="w-full mb-4 px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
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
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-md"
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

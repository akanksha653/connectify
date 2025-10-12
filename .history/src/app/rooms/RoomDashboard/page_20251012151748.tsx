"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectRoomSocket, disconnectRoomSocket } from "../../features/RoomChat/services/roomSocketService";

interface Room {
  id: string;
  name: string;
  topic: string;
  description?: string;
  hasPassword?: boolean;
  users?: { socketId: string }[];
}

export default function RoomDashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [socket, setSocket] = useState<any>(null);

  const [newRoom, setNewRoom] = useState({ name: "", topic: "", description: "", password: "" });

  // -----------------------------
  // Connect to /rooms socket
  // -----------------------------
  useEffect(() => {
    const s = connectRoomSocket();
    setSocket(s);

    s.on("connected", () => console.log("✅ Connected to /rooms namespace"));
    s.on("rooms", (list: Room[]) => setRooms(list));

    return () => {
      disconnectRoomSocket();
      setSocket(null);
    };
  }, []);

  // -----------------------------
  // Create Room
  // -----------------------------
  const handleCreateRoom = () => {
    if (!newRoom.name || !newRoom.topic) return alert("Name & Topic are required");
    socket.emit("create-room", newRoom);
    setNewRoom({ name: "", topic: "", description: "", password: "" });
  };

  // Listen for room created feedback
  useEffect(() => {
    if (!socket) return;
    socket.on("room-created", (room: Room) => {
      setRooms((prev) => [...prev, room]);
      router.push(`/rooms/${room.id}`);
    });
    socket.on("create-room-error", (err: { message: string }) => {
      alert("Error creating room: " + err.message);
    });
    return () => {
      socket.off("room-created");
      socket.off("create-room-error");
    };
  }, [socket, router]);

  // -----------------------------
  // Join Room
  // -----------------------------
  const joinRoom = (roomId: string) => {
    router.push(`/rooms/${roomId}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Room Dashboard</h1>

      {/* Create Room */}
      <div className="bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Create a Room</h2>
        <input
          type="text"
          placeholder="Room Name"
          value={newRoom.name}
          onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
          className="w-full p-2 mb-2 rounded border"
        />
        <input
          type="text"
          placeholder="Topic"
          value={newRoom.topic}
          onChange={(e) => setNewRoom({ ...newRoom, topic: e.target.value })}
          className="w-full p-2 mb-2 rounded border"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={newRoom.description}
          onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
          className="w-full p-2 mb-2 rounded border"
        />
        <input
          type="password"
          placeholder="Password (optional)"
          value={newRoom.password}
          onChange={(e) => setNewRoom({ ...newRoom, password: e.target.value })}
          className="w-full p-2 mb-2 rounded border"
        />
        <button
          onClick={handleCreateRoom}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Create Room
        </button>
      </div>

      {/* Room List */}
      <div className="bg-gray-50 dark:bg-neutral-900 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Available Rooms</h2>
        {rooms.length === 0 && <p>No rooms yet. Create one above!</p>}
        <ul className="space-y-2">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="p-3 bg-white dark:bg-gray-800 rounded flex justify-between items-center shadow hover:shadow-md cursor-pointer"
            >
              <div>
                <h3 className="font-bold">{room.name}</h3>
                <p className="text-sm">{room.topic}</p>
                {room.description && <p className="text-xs text-gray-500 dark:text-gray-400">{room.description}</p>}
              </div>
              <button
                onClick={() => joinRoom(room.id)}
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                Join
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

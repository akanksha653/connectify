"use client";

import React, { useState, useEffect } from "react";
import CreateRoomModal from "./CreateRoomModal";
import JoinRoomModal from "./JoinRoomModal";
import type { Room, Participant } from "../utils/roomTypes";

interface RoomLobbyProps {
  rooms: Room[];
  connected: boolean;
}

export default function RoomLobby({ rooms, connected }: RoomLobbyProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [localRooms, setLocalRooms] = useState<Room[]>([]);

  // --- Deduplicate and sync ---
  useEffect(() => {
    console.log("🌀 Syncing incoming rooms:", rooms);

    const map = new Map<string, Room>();
    rooms.forEach((r) => {
      if (r && r.id) map.set(r.id, r);
    });

    setLocalRooms(Array.from(map.values()));
  }, [rooms]);

  // --- Handle Create Room ---
  const handleCreateRoom = (payload: { name: string; topic: string; description?: string }) => {
    console.log("🧩 Create Room Payload:", payload);

    const newRoom: Room = {
      id: "local-" + Math.random().toString(36).substring(2, 10),
      name: payload.name.trim(),
      topic: payload.topic.trim(),
      description: payload.description || "",
      users: [],
    };

    setLocalRooms((prev) => {
      const exists = prev.find((r) => r.name.toLowerCase() === newRoom.name.toLowerCase());
      if (exists) {
        console.warn("⚠️ Room already exists:", newRoom.name);
        return prev;
      }
      const updated = [...prev, newRoom];
      console.log("✅ Room created locally:", newRoom);
      console.log("📦 Updated room list:", updated);
      return updated;
    });

    setShowCreateModal(false);
  };

  // --- Handle Join Room ---
  const handleJoinRoom = (roomId: string) => {
    const tempUser: Participant = {
      socketId: "temp-" + Math.random().toString(36).substring(2, 10),
      userInfo: {
        name: "User-" + Math.floor(Math.random() * 1000),
        country: "Unknown",
        age: "?",
      },
    };

    console.log("🚀 Joining Room:", roomId, tempUser);
    setShowJoinModal(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Rooms Lobby {connected ? "🟢 Online" : "🔴 Offline"}
      </h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Create Room
        </button>
        <button
          onClick={() => setShowJoinModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Join Room
        </button>
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
      />
      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        rooms={localRooms}
        onJoin={handleJoinRoom}
      />

      {/* Room List */}
      <ul className="space-y-2">
        {localRooms.length ? (
          localRooms.map((room) => (
            <li
              key={room.id}
              className="p-3 border rounded flex justify-between items-center hover:shadow-md transition"
            >
              <div>
                <div className="font-semibold">{room.name}</div>
                <div className="text-sm text-gray-500">
                  {room.topic} • {room.users?.length || 0} participant
                  {(room.users?.length || 0) !== 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={() => handleJoinRoom(room.id)}
                className="text-blue-600 text-sm font-medium"
              >
                Join
              </button>
            </li>
          ))
        ) : (
          <li className="text-gray-500">No rooms available.</li>
        )}
      </ul>
    </div>
  );
}

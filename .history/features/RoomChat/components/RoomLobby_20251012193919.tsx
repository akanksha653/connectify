"use client";

import React, { useState, useEffect } from "react";
import { useRoomSocket } from "../hooks/useRoomSocket";
import CreateRoomModal from "./CreateRoomModal";
import JoinRoomModal from "./JoinRoomModal";
import type { Room } from "../utils/roomTypes";

export default function RoomLobby() {
  const { 
    rooms, 
    connected, 
    createRoom, 
    joinRoom 
  } = useRoomSocket();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [localRooms, setLocalRooms] = useState<Room[]>([]);

  // Keep localRooms in sync with socket rooms
  useEffect(() => {
    setLocalRooms(rooms);
  }, [rooms]);

  const handleCreateRoom = (payload: { name: string; topic: string; description?: string }) => {
    createRoom(payload);
    setShowCreateModal(false);
  };

  const handleJoinRoom = (roomId: string) => {
    joinRoom(roomId, { name: "Anonymous" });
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
                  {room.topic} • {room.users?.length || 0} participant{(room.users?.length || 0) !== 1 ? "s" : ""}
                </div>
              </div>
            </li>
          ))
        ) : (
          <li className="text-gray-500">No rooms available.</li>
        )}
      </ul>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import CreateRoomModal from "./CreateRoomModal";
import JoinRoomModal from "./JoinRoomModal";
import { connectRoomSocket, createRoom, joinRoom } from "../services/roomSocketService";
import type { Room, Participant } from "../utils/roomTypes";

export default function RoomLobby() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    const socket = connectRoomSocket((updatedRooms) => setRooms(updatedRooms));

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = (payload: { name: string; topic: string }) => {
    if (socketConnected) createRoom(payload);
    setShowCreateModal(false);
  };

  const handleJoinRoom = (roomId: string) => {
    const user: Participant = {
      socketId: "temp-" + Math.random().toString(36).substring(2, 8),
      userInfo: { name: "User-" + Math.floor(Math.random() * 1000), country: "Unknown", age: "?" },
    };
    if (socketConnected) joinRoom(roomId, user.userInfo);
    setShowJoinModal(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Rooms Lobby {socketConnected ? "🟢 Live (Socket)" : "🟡 Offline / Local Fallback"}
      </h2>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded">
          Create Room
        </button>
        <button onClick={() => setShowJoinModal(true)} className="px-4 py-2 bg-green-600 text-white rounded">
          Join Room
        </button>
      </div>

      <CreateRoomModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateRoom} />
      <JoinRoomModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} rooms={rooms} onJoin={handleJoinRoom} />

      <ul className="space-y-2">
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <li key={room.id} className="p-3 border rounded flex justify-between items-center hover:shadow-md">
              <div>
                <div className="font-semibold">{room.name}</div>
                <div className="text-sm text-gray-500">
                  {room.topic || "No topic"} • {room.users?.length || 0} user{(room.users?.length || 0) !== 1 ? "s" : ""}
                </div>
              </div>
              <button onClick={() => handleJoinRoom(room.id)} className="text-blue-600 text-sm font-medium">
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

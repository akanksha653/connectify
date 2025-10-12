import React, { useState, useEffect } from "react";
import { useRoomSocket } from "../hooks/useRoomSocket";
import CreateRoomModal from "./CreateRoomModal";
import JoinRoomModal from "./JoinRoomModal";
import type { Room } from "../utils/roomTypes";

interface RoomLobbyProps {
  rooms: Room[];
  connected: boolean;
}

export default function RoomLobby({ rooms, connected }: RoomLobbyProps) {
  const { createRoom, joinRoom } = useRoomSocket();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleJoinRoom = (roomId: string) => {
    joinRoom(roomId, { name: "Anonymous" });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Rooms Lobby {connected ? "🟢 Online" : "🔴 Offline"}
      </h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Create Room
        </button>
        <button
          onClick={() => setShowJoinModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Join Room
        </button>
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createRoom}
      />
      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        rooms={rooms}
        onJoin={handleJoinRoom}
      />

      <ul className="space-y-2">
        {rooms.length ? (
          rooms.map((room) => (
            <li key={room.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-semibold">{room.name}</div>
                <div className="text-sm text-gray-500">
                  {room.topic} • {room.users?.length || 0} users
                </div>
              </div>
            </li>
          ))
        ) : (
          <li className="text-gray-500">No rooms yet</li>
        )}
      </ul>
    </div>
  );
}

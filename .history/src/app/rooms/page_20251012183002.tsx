"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import RoomLobby from "../../../features/RoomChat/components/RoomLobby";
import { useRoomSocket } from "../../../features/RoomChat/hooks/useRoomSocket";
import { fetchRooms } from "../../../features/RoomChat/services/roomService";

export default function RoomsPage() {
  const { rooms: socketRooms, connected } = useRoomSocket();
  const [rooms, setRooms] = useState(socketRooms);

  // Merge socket rooms with current state
  useEffect(() => {
    setRooms((prev) => {
      const merged = [...socketRooms];
      prev.forEach((r) => {
        if (!merged.find((s) => s.id === r.id)) merged.push(r);
      });
      return merged;
    });
  }, [socketRooms]);

  // Fetch initial rooms via REST as fallback
  useEffect(() => {
    fetchRooms()
      .then((r) => setRooms((prev) => [...prev, ...r.filter((room) => !prev.find((p) => p.id === room.id))]))
      .catch(() => {
        console.warn("Failed to fetch rooms via REST.");
      });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Rooms Lobby {connected ? "🟢 Online" : "🔴 Offline"}
      </h1>

      <RoomLobby rooms={rooms} connected={connected} />

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Available Rooms</h2>
        {rooms.length ? (
          <ul className="space-y-2">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="border rounded p-3 flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold">{room.name}</div>
                  <div className="text-sm text-gray-500">
                    {room.topic} • {room.users?.length || 0} users
                  </div>
                </div>
                <Link
                  className="text-blue-600 text-sm font-medium"
                  href={`/rooms/${room.id}`}
                >
                  Join
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">No rooms available.</div>
        )}
      </div>
    </div>
  );
}

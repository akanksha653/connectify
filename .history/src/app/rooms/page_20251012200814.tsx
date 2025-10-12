"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import RoomLobby from "../../../features/RoomChat/components/RoomLobby";
import { useRoomSocket } from "../../../features/RoomChat/hooks/useRoomSocket";
import { fetchRooms } from "../../../features/RoomChat/services/roomService";
import type { Room } from "../../../features/RoomChat/utils/roomTypes";

export default function RoomsPage() {
  const { rooms: socketRooms, connected } = useRoomSocket();
  const [rooms, setRooms] = useState<Room[]>([]);

  // --- Merge socket rooms with existing state ---
  useEffect(() => {
    setRooms((prev) => {
      const merged: Room[] = [...socketRooms];

      // Add previous rooms that socket did not provide
      prev.forEach((r) => {
        if (!merged.find((s) => s.id === r.id)) merged.push(r);
      });

      return merged;
    });
  }, [socketRooms]);

  // --- Fetch initial rooms from Firestore / REST as fallback ---
  useEffect(() => {
    fetchRooms()
      .then((fetchedRooms) => {
        setRooms((prev) => [
          ...prev,
          ...fetchedRooms.filter((room) => !prev.find((r) => r.id === room.id)),
        ]);
      })
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
        {rooms.length > 0 ? (
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
                  href={`/rooms/${room.id}`}
                  className="text-blue-600 text-sm font-medium"
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

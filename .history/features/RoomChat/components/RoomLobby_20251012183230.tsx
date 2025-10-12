"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { fetchRooms } from "../services/roomService";
import type { Room } from "../utils/roomTypes";

export default function RoomLobby() {
  const { rooms: socketRooms, createRoom, connected } = useRoomSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");

  // Sync socket rooms with local state
  useEffect(() => {
    setRooms(socketRooms);
  }, [socketRooms]);

  // Fetch initial rooms via REST as fallback (Firebase)
  useEffect(() => {
    fetchRooms()
      .then((fetchedRooms) => {
        setRooms((prevRooms) => {
          // Merge socket rooms and fetched rooms without duplicates
          const allRooms = [...prevRooms];
          fetchedRooms.forEach((r) => {
            if (!allRooms.find((room) => room.id === r.id)) allRooms.push(r);
          });
          return allRooms;
        });
      })
      .catch(() => console.warn("Failed to fetch rooms via REST."));
  }, []);

  const onCreate = () => {
    if (!name || !topic) return;
    createRoom({ name, topic });
    setName("");
    setTopic("");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Rooms Lobby {connected ? "🟢 Online" : "🔴 Offline"}
      </h2>

      <div className="mb-6 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Room name"
          className="border p-2 flex-1 min-w-[150px]"
        />
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic"
          className="border p-2 flex-1 min-w-[150px]"
        />
        <button
          onClick={onCreate}
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          Create
        </button>
      </div>

      <ul className="space-y-2">
        {rooms.length ? (
          rooms.map((room) => (
            <li
              key={room.id}
              className="p-3 border rounded flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{room.name}</div>
                <div className="text-sm text-gray-500">
                  {room.topic} • {room.users?.length || 0} users
                </div>
              </div>
              <Link
                className="text-sm text-blue-600"
                href={`/rooms/${room.id}`}
              >
                Open
              </Link>
            </li>
          ))
        ) : (
          <li className="text-gray-500">No rooms yet</li>
        )}
      </ul>
    </div>
  );
}

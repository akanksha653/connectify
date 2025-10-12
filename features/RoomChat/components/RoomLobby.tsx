// features/RoomSystem/components/RoomLobby.tsx
import React, { useEffect, useState } from "react";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { fetchRooms } from "../services/roomService";

export default function RoomLobby() {
  const { rooms, createRoom, joinRoom, connected } = useRoomSocket();
  const [localRooms, setLocalRooms] = useState(rooms);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    setLocalRooms(rooms);
  }, [rooms]);

  useEffect(() => {
    // initial fetch via REST as fallback
    fetchRooms().then((r) => setLocalRooms(r)).catch(() => {});
  }, []);

  const onCreate = () => {
    if (!name || !topic) return;
    createRoom({ name, topic });
    setName("");
    setTopic("");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Rooms Lobby {connected ? "🟢" : "🔴"}</h2>

      <div className="mt-4 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" className="border p-2 mr-2" />
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" className="border p-2 mr-2" />
        <button onClick={onCreate} className="bg-blue-600 text-white px-3 py-2 rounded">Create</button>
      </div>

      <ul className="space-y-2">
        {localRooms?.length ? localRooms.map((r) => (
          <li key={r.id} className="p-3 border rounded flex justify-between items-center">
            <div>
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-gray-500">{r.topic}</div>
            </div>
            <div className="flex gap-2">
              <a className="text-sm text-blue-600" href={`/rooms/${r.id}`}>Open</a>
            </div>
          </li>
        )) : <li>No rooms yet</li>}
      </ul>
    </div>
  );
}

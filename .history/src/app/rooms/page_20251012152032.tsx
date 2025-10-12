"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectRoomSocket, disconnectRoomSocket } from "../features/RoomChat/services/roomSocketService";
import { Button } from "../components/common/Button";

interface Room {
  id: string;
  name: string;
  topic: string;
  description?: string;
  users?: { socketId: string; userInfo: any }[];
}

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [roomName, setRoomName] = useState("");
  const [roomTopic, setRoomTopic] = useState("");

  useEffect(() => {
    const s = connectRoomSocket();
    setSocket(s);

    // Get all rooms
    s.on("rooms", (data: Room[]) => setRooms(data));

    // Fetch rooms from server
    s.emit("get-rooms");

    return () => {
      disconnectRoomSocket();
    };
  }, []);

  const createRoom = () => {
    if (!roomName || !roomTopic) return alert("Please enter name and topic");
    socket.emit("create-room", { name: roomName, topic: roomTopic });
    setRoomName("");
    setRoomTopic("");
  };

  const joinRoom = (id: string) => {
    router.push(`/rooms/${id}`);
  };

  return (
    <div className="p-6 min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <h1 className="text-2xl font-bold mb-6">Rooms Dashboard</h1>

      {/* Create Room */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          placeholder="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="p-2 border rounded flex-1"
        />
        <input
          type="text"
          placeholder="Room Topic"
          value={roomTopic}
          onChange={(e) => setRoomTopic(e.target.value)}
          className="p-2 border rounded flex-1"
        />
        <Button onClick={createRoom}>Create Room</Button>
      </div>

      {/* List of Rooms */}
      {rooms.length === 0 ? (
        <p>No rooms available yet.</p>
      ) : (
        <div className="grid gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="p-4 border rounded flex justify-between items-center bg-white dark:bg-neutral-800 shadow"
            >
              <div>
                <h2 className="font-semibold">{room.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{room.topic}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {room.users?.length ?? 0} users
                </p>
              </div>
              <Button onClick={() => joinRoom(room.id)}>Join</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

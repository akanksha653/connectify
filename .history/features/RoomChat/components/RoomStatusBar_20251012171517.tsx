// features/RoomChat/components/RoomStatusBar.tsx
import React from "react";
import { useRoomSocket } from "../hooks/useRoomSocket";

type Props = {
  roomId: string;
};

export default function RoomStatusBar({ roomId }: Props) {
  const { rooms, currentRoomUsers, connected } = useRoomSocket();

  const room = rooms.find((r) => r.id === roomId);

  return (
    <div className="flex justify-between items-center p-2 border-b bg-gray-100 rounded-t">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-700">
          {room?.name || "Room"}
        </span>
        <span className="text-sm text-gray-500">
          ({currentRoomUsers.length} participant{currentRoomUsers.length !== 1 ? "s" : ""})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            connected ? "bg-green-500" : "bg-red-500"
          }`}
        ></span>
        <span className="text-sm text-gray-600">{connected ? "Connected" : "Disconnected"}</span>
      </div>
    </div>
  );
}

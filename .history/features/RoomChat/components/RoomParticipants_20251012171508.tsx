// features/RoomChat/components/RoomParticipants.tsx
import React from "react";
import { useRoomSocket } from "../hooks/useRoomSocket";

type Props = {
  roomId: string;
};

export default function RoomParticipants({ roomId }: Props) {
  const { currentRoomUsers } = useRoomSocket();

  return (
    <div className="p-2 border rounded bg-gray-50 max-h-80 overflow-auto">
      <h3 className="text-sm font-semibold mb-2">Participants</h3>
      {currentRoomUsers.length > 0 ? (
        <ul className="space-y-2">
          {currentRoomUsers.map((user) => (
            <li
              key={user.socketId}
              className="flex items-center gap-2 p-2 border rounded bg-white"
            >
              <div className="h-8 w-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {user.userInfo.name[0].toUpperCase()}
              </div>
              <div className="flex flex-col text-sm">
                <span className="font-medium">{user.userInfo.name}</span>
                <span className="text-gray-500 text-xs">
                  {user.userInfo.age} yrs, {user.userInfo.country}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm">No participants yet</p>
      )}
    </div>
  );
}

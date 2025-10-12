"use client";

import React from "react";
import { FiMic, FiMicOff, FiVideo, FiVideoOff } from "react-icons/fi";
import { useRoomSocket } from "../hooks/useRoomSocket";

type Props = {
  roomId: string;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
};

export default function RoomStatusBar({
  roomId,
  micEnabled = true,
  cameraEnabled = true,
  onToggleMic,
  onToggleCamera,
}: Props) {
  const { rooms, currentRoomUsers, connected } = useRoomSocket();

  const room = rooms.find((r) => r.id === roomId);

  return (
    <div className="flex justify-between items-center p-2 border-b bg-gray-100 rounded-t">
      {/* Room Info */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-700">{room?.name || "Room"}</span>
        <span className="text-sm text-gray-500">
          ({currentRoomUsers.length} participant{currentRoomUsers.length !== 1 ? "s" : ""})
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <span
          className={`h-3 w-3 rounded-full ${
            connected ? "bg-green-500" : "bg-red-500"
          }`}
        ></span>
        <span className="text-sm text-gray-600">
          {connected ? "Connected" : "Disconnected"}
        </span>

        {/* Camera Toggle */}
        {onToggleCamera && (
          <button
            onClick={onToggleCamera}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
          >
            {cameraEnabled ? (
              <FiVideo className="w-5 h-5 text-gray-700" />
            ) : (
              <FiVideoOff className="w-5 h-5 text-red-500" />
            )}
          </button>
        )}

        {/* Mic Toggle */}
        {onToggleMic && (
          <button
            onClick={onToggleMic}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
          >
            {micEnabled ? (
              <FiMic className="w-5 h-5 text-gray-700" />
            ) : (
              <FiMicOff className="w-5 h-5 text-red-500" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

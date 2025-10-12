"use client";

import React, { useEffect, useRef } from "react";
import type { Room } from "../utils/roomTypes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  onJoin: (roomId: string) => void;
}

export default function JoinRoomModal({ isOpen, onClose, rooms, onJoin }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      modalRef.current?.focus();
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Join a Room</h2>

        {rooms.length ? (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="border p-3 rounded flex justify-between items-center hover:shadow-md transition cursor-pointer"
              >
                <div>
                  <div className="font-semibold">{room.name}</div>
                  <div className="text-sm text-gray-500">
                    {room.topic || "No topic"} • {room.users?.length || 0} user
                    {(room.users?.length || 0) !== 1 ? "s" : ""}
                  </div>
                </div>
                <button
                  onClick={() => onJoin(room.id)}
                  className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">No rooms available.</div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import type { Room } from "../utils/roomTypes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (room: { name: string; topic: string }) => void;
}

export default function CreateRoomModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");

  const handleCreate = () => {
    if (!name || !topic) return;
    onCreate({ name, topic });
    setName("");
    setTopic("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Room</h2>

        <input
          type="text"
          placeholder="Room Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
        />
        <input
          type="text"
          placeholder="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full border p-2 mb-4 rounded"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

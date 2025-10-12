"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Room } from "../utils/roomTypes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (room: { name: string; topic: string }) => void;
}

export default function CreateRoomModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setTopic("");
      nameInputRef.current?.focus();
    }
  }, [isOpen]);

  const handleCreate = () => {
    const trimmedName = name.trim();
    const trimmedTopic = topic.trim();
    if (!trimmedName || !trimmedTopic) return;

    onCreate({ name: trimmedName, topic: trimmedTopic });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Room</h2>

        <input
          ref={nameInputRef}
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
            disabled={!name.trim() || !topic.trim()}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

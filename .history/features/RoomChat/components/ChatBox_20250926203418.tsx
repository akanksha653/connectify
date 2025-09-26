"use client";

import React, { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  user: string;
  text: string;
}

interface Props {
  socket: any;
  roomId: string;
  userName: string;
}

export default function ChatBox({ socket, roomId, userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("room-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("room-message");
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const msg: Message = {
      id: crypto.randomUUID(),
      user: userName,
      text: input.trim(),
    };

    socket.emit("room-message", { roomId, ...msg });
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full border rounded p-2 bg-white dark:bg-neutral-900">
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map((m) => (
          <p key={m.id} className="mb-1 text-sm">
            <strong>{m.user}:</strong> {m.text}
          </p>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}

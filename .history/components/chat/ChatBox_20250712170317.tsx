"use client";

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import Message from "./Message"; // <-- Import message component

interface ChatBoxProps {
  socket: any;
  roomId: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "me" | "partner";
  timestamp: string;
}

export default function ChatBox({ socket, roomId }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = ({ message, sender }: { message: string; sender: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          content: message,
          sender: sender === socket.id ? "me" : "partner",
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    socket.emit("send-message", { roomId, message: trimmed });

    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        content: trimmed,
        sender: "me",
        timestamp: new Date().toISOString(),
      },
    ]);

    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-h-full bg-neutral-50 dark:bg-neutral-800">
      {/* Chat Message List with Scroll */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            content={msg.content}
            sender={msg.sender}
            timestamp={msg.timestamp}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-4 border-t border-neutral-300 dark:border-neutral-700 flex">
        <input
          type="text"
          className="flex-1 rounded-l-md px-3 py-2 text-sm focus:outline-none border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-700 text-neutral-900 dark:text-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}

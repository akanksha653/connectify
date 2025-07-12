"use client";

import React, { useState, useEffect, useRef } from "react";
import Message from "./Message";

interface ChatBoxProps {
  socket: any;
  roomId: string;
}

export default function ChatBox({ socket, roomId }: ChatBoxProps) {
  const [messages, setMessages] = useState<{ content: string; sender: string }[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    // Listen for incoming messages
    const handleReceiveMessage = ({ message, sender }: { message: string; sender: string }) => {
      setMessages((prev) => [...prev, { content: message, sender }]);
    };

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket]);

  const sendMessage = () => {
    if (!input.trim()) return;

    // Emit using correct event name
    socket.emit("send-message", { roomId, message: input });

    // Add to local state immediately
    setMessages((prev) => [...prev, { content: input, sender: "me" }]);
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, i) => (
          <Message key={i} content={msg.content} sender={msg.sender as "me" | "partner"} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-neutral-300 dark:border-neutral-700 flex">
        <input
          type="text"
          className="flex-1 rounded-l-md px-3 py-2 text-sm focus:outline-none border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md text-sm transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}

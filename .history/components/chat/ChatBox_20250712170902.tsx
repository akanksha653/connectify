"use client";

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import Message from "./Message";
import TypingIndicator from "./TypingIndicator";

interface ChatBoxProps {
  socket: any;
  roomId: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "me" | "partner";
  timestamp: string;
  status?: "sent" | "delivered" | "seen";
  type?: "text" | "audio" | "video";
}

export default function ChatBox({ socket, roomId }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaURL, setMediaURL] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = ({ message, sender, type = "text" }: any) => {
      const newMsg: ChatMessage = {
        id: uuidv4(),
        content: message,
        sender: sender === socket.id ? "me" : "partner",
        timestamp: new Date().toISOString(),
        status: "seen",
        type,
      };

      setMessages((prev) => [...prev, newMsg]);

      socket.emit("message-status", {
        roomId,
        messageId: newMsg.id,
        status: "seen",
      });

      setPartnerTyping(false);
    };

    const handleTyping = ({ sender }: any) => {
      if (sender !== socket.id) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 3000);
      }
    };

    const handleStatusUpdate = ({ messageId, status }: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status } : msg
        )
      );
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("message-status-update", handleStatusUpdate);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("message-status-update", handleStatusUpdate);
    };
  }, [socket, roomId]);

  const sendMessage = (type: "text" | "audio" | "video" = "text") => {
    if (!input.trim() && type === "text") return;

    const messageId = uuidv4();
    const payload = {
      roomId,
      message: type === "text" ? input.trim() : mediaURL,
      messageId,
      type,
    };

    socket.emit("send-message", payload);

    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        content: payload.message,
        sender: "me",
        timestamp: new Date().toISOString(),
        status: "sent",
        type,
      },
    ]);

    if (type === "text") setInput("");
    if (type !== "text") setMediaURL(null);
    setPartnerTyping(false);
    setShowEmojiPicker(false);
  };

  const handleTyping = () => {
    socket.emit("typing", { roomId, sender: socket.id });
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "audio" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setMediaURL(url);
    sendMessage(type);
  };

  return (
    <div className="flex flex-col h-full max-h-full bg-neutral-50 dark:bg-neutral-800">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            content={msg.content}
            sender={msg.sender}
            timestamp={msg.timestamp}
            status={msg.status}
            type={msg.type}
          />
        ))}
        {partnerTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="relative p-4 border-t border-neutral-300 dark:border-neutral-700 flex items-center gap-2">
        <button onClick={() => setShowEmojiPicker((prev) => !prev)} className="text-xl">😊</button>

        {showEmojiPicker && (
          <div className="absolute bottom-14 left-0 z-50">
            <Picker data={data} onEmojiSelect={(e: any) => setInput((p) => p + e.native)} theme="auto" />
          </div>
        )}

        <input
          type="text"
          className="flex-1 rounded-md px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage("text")}
        />

        <label className="cursor-pointer text-xs text-blue-600 hover:underline">
          🎤
          <input type="file" accept="audio/*" hidden onChange={(e) => handleMediaUpload(e, "audio")} />
        </label>
        <label className="cursor-pointer text-xs text-blue-600 hover:underline">
          📹
          <input type="file" accept="video/*" hidden onChange={(e) => handleMediaUpload(e, "video")} />
        </label>

        <button
          onClick={() => sendMessage("text")}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

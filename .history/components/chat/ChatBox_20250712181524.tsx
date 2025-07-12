"use client";

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
const debounce = require('lodash/debounce');
import { Picker } from "emoji-mart"; // ✅ CORRECT
import data from "@emoji-mart/data";
import Message from "./Message";
import TypingIndicator from "./TypingIndicator";

interface ChatBoxProps {
  socket: any;
  roomId: string;
}

export default function ChatBox({ socket, roomId }: ChatBoxProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg: any) => {
      setMessages(prev => [...prev, msg]);
      socket.emit("message-status", { roomId, messageId: msg.id, status: "seen" });
      setPartnerTyping(false);
    };

    const onTyping = ({ sender }: any) => {
      if (sender !== socket.id) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 3000);
      }
    };

    const onStatus = ({ messageId, status }: any) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status } : m));
    };

    const onDelete = ({ messageId }: any) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    const onReact = ({ messageId, reaction, user }: any) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, reactions: { ...m.reactions, [user]: reaction } }
          : m
      ));
    };

    socket.on("receive-message", onMessage);
    socket.on("typing", onTyping);
    socket.on("message-status-update", onStatus);
    socket.on("message-deleted", onDelete);
    socket.on("message-react", onReact);

    return () => {
      socket.off("receive-message", onMessage);
      socket.off("typing", onTyping);
      socket.off("message-status-update", onStatus);
      socket.off("message-deleted", onDelete);
      socket.off("message-react", onReact);
    };
  }, [socket, roomId]);

  const debouncedTyping = useRef(debounce(() => {
    socket.emit("typing", { roomId, sender: socket.id });
  }, 300)).current;

  const sendMessage = (payload: any) => {
    const msg = {
      ...payload,
      id: uuidv4(),
      sender: "me",
      timestamp: new Date().toISOString(),
      status: "sent",
      reactions: {}
    };
    socket.emit("send-message", msg);
    setMessages(prev => [...prev, msg]);
    setInput("");
    setShowEmojiPicker(false);
    setPartnerTyping(false);
  };

  const sendText = () => {
    if (!input.trim()) return;
    sendMessage({ content: input.trim(), type: "text", roomId });
  };

  const handleFile = (e: any, type: string) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    sendMessage({ content: url, roomId, type });
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map(msg => (
          <Message
            key={msg.id}
            {...msg}
            onDelete={() => socket.emit("delete-message", { roomId, messageId: msg.id })}
            onEdit={(newContent: string) => socket.emit("edit-message", { roomId, messageId: msg.id, content: newContent })}
            onReact={(reaction: string) => socket.emit("react-message", { roomId, messageId: msg.id, reaction, user: socket.id })}
          />
        ))}
        {partnerTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative p-4 border-t border-neutral-300 dark:border-neutral-700 flex items-center gap-2">
        <button onClick={() => setShowEmojiPicker(prev => !prev)} className="text-xl">😊</button>
        {showEmojiPicker && (
          <div className="absolute bottom-14 left-0 z-50">
            <Picker data={data} onEmojiSelect={(e: any) => setInput(prev => prev + e.native)} />
          </div>
        )}

        <input
          type="text"
          className="flex-1 rounded-md px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700"
          placeholder="Type a message..."
          value={input}
          onChange={e => { setInput(e.target.value); debouncedTyping(); }}
          onKeyDown={e => e.key === "Enter" && sendText()}
        />

        <label className="cursor-pointer">📎
          <input type="file" accept="image/*" hidden onChange={e => handleFile(e, "image")} />
        </label>
        <label className="cursor-pointer">🎤
          <input type="file" accept="audio/*" hidden onChange={e => handleFile(e, "audio")} />
        </label>
        <label className="cursor-pointer">📹
          <input type="file" accept="video/*" hidden onChange={e => handleFile(e, "video")} />
        </label>

        <button
          onClick={sendText}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

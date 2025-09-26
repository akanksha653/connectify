"use client";

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
const debounce = require("lodash/debounce");

import Message from "./Message";
import TypingIndicator from "./TypingIndicator";

interface ChatBoxProps {
  socket: any;
  roomId: string;
}

const topEmojis = [
  "😀", "😂", "😍", "🤣", "😊", "😭", "🥰", "😎", "👍", "🙏",
  "😘", "😅", "🎉", "🤔", "🙄", "😢", "🔥", "💯", "❤️", "👏"
];

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
      setMessages((prev) => [...prev, msg]);
      socket.emit("message-status", {
        roomId,
        messageId: msg.id,
        status: "seen",
      });
      setPartnerTyping(false);
    };

    const onTyping = ({ sender }: any) => {
      if (sender !== socket.id) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 3000);
      }
    };

    const onStatus = ({ messageId, status }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, status } : m
        )
      );
    };

    const onDelete = ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const onReact = ({ messageId, reaction, user }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: { ...m.reactions, [user]: reaction },
              }
            : m
        )
      );
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

  const debouncedTyping = useRef(
    debounce(() => {
      socket.emit("typing", { roomId, sender: socket.id });
    }, 300)
  ).current;

  const sendMessage = (payload: any) => {
    const msg = {
      ...payload,
      id: uuidv4(),
      sender: socket.id,
      timestamp: new Date().toISOString(),
      status: "sent",
      reactions: {},
    };
    socket.emit("send-message", msg);
    setMessages((prev) => [...prev, msg]);
    setInput("");
    setShowEmojiPicker(false);
    setPartnerTyping(false);
  };

  const sendText = () => {
    if (!input.trim()) return;
    sendMessage({ content: input.trim(), type: "text", roomId });
  };

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    sendMessage({ content: url, roomId, type });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border rounded-lg overflow-hidden shadow-lg relative">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-neutral-400 dark:scrollbar-thumb-neutral-700">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            {...msg}
            sender={msg.sender === socket.id ? "me" : "partner"}
            onDelete={() =>
              socket.emit("delete-message", {
                roomId,
                messageId: msg.id,
              })
            }
            onEdit={(newContent: string) =>
              socket.emit("edit-message", {
                roomId,
                messageId: msg.id,
                content: newContent,
              })
            }
            onReact={(reaction: string) =>
              socket.emit("react-message", {
                roomId,
                messageId: msg.id,
                reaction,
                user: socket.id,
              })
            }
          />
        ))}
        {partnerTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50 bg-white dark:bg-neutral-800 border rounded-md shadow-lg p-3 w-64 max-h-64 overflow-y-auto grid grid-cols-5 gap-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
          {topEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setInput((prev) => prev + emoji)}
              className="text-2xl hover:scale-110 transition-transform"
              aria-label={`Insert emoji ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Controls */}
      <div className="w-full border-t dark:border-neutral-700 px-4 py-3 flex items-center gap-3 bg-white dark:bg-neutral-900">
        {/* Emoji Toggle */}
        <button
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="text-2xl hover:scale-110 transition-transform"
          aria-label="Toggle emoji picker"
        >
          😊
        </button>

        {/* Text Input */}
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            debouncedTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-sm px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* File Uploads */}
        <div className="flex items-center gap-2 text-xl">
          <label className="cursor-pointer" title="Send Image">
            📎
            <input type="file" accept="image/*" hidden onChange={(e) => handleFile(e, "image")} />
          </label>
          <label className="cursor-pointer" title="Send Audio">
            🎤
            <input type="file" accept="audio/*" hidden onChange={(e) => handleFile(e, "audio")} />
          </label>
          <label className="cursor-pointer" title="Send Video">
            📹
            <input type="file" accept="video/*" hidden onChange={(e) => handleFile(e, "video")} />
          </label>
        </div>

        {/* Send Button */}
        <button
          onClick={sendText}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

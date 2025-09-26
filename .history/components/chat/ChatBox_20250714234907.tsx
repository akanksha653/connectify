"use client";

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
const debounce = require("lodash/debounce");

import Message from "./Message";
import TypingIndicator from "./TypingIndicator";

interface ChatBoxProps {
  socket: any;
  roomId: string;
  soundOn?: boolean;
}

const topEmojis = [
  "😀", "😂", "😍", "🤣", "😊", "😭", "🥰", "😎", "👍", "🙏",
  "😘", "😅", "🎉", "🤔", "🙄", "😢", "🔥", "💯", "❤️", "👏"
];

export default function ChatBox({ socket, roomId, soundOn = true }: ChatBoxProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sentSoundRef = useRef<HTMLAudioElement>(null);
  const receiveSoundRef = useRef<HTMLAudioElement>(null);

  const playSound = (type: "sent" | "receive") => {
    if (!soundOn) return;

    const audioRef = type === "sent" ? sentSoundRef : receiveSoundRef;
    const play = async () => {
      try {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = 0.8;
        await audio.play();
      } catch (err) {
        // Autoplay restrictions: resume on user gesture
        const ctx = new AudioContext();
        await ctx.resume();
      }
    };
    play();
  };

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
      playSound("receive");
    };

    const onTyping = ({ sender }: any) => {
      if (sender !== socket.id) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 3000);
      }
    };

    const onStatus = ({ messageId, status }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status } : m))
      );
    };

    const onDelete = ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const onReact = ({ messageId, reaction, user }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: { ...m.reactions, [user]: reaction } }
            : m
        )
      );
    };

    const onEdit = ({ messageId, content }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content } : m))
      );
    };

    socket.on("receive-message", onMessage);
    socket.on("typing", onTyping);
    socket.on("message-status-update", onStatus);
    socket.on("message-deleted", onDelete);
    socket.on("message-react", onReact);
    socket.on("message-edited", onEdit);

    return () => {
      socket.off("receive-message", onMessage);
      socket.off("typing", onTyping);
      socket.off("message-status-update", onStatus);
      socket.off("message-deleted", onDelete);
      socket.off("message-react", onReact);
      socket.off("message-edited", onEdit);
    };
  }, [socket, roomId, soundOn]);

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
    playSound("sent");
    setInput("");
    setShowEmojiPicker(false);
    setPartnerTyping(false);
  };

  const sendText = () => {
    if (!input.trim()) return;
    sendMessage({ content: input.trim(), type: "text", roomId });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const mime = file.type;

    let type: "image" | "audio" | "video" | "file" = "file";
    if (mime.startsWith("image")) type = "image";
    else if (mime.startsWith("audio")) type = "audio";
    else if (mime.startsWith("video")) type = "video";

    sendMessage({ content: url, type, roomId });
  };

  return (
    <div className="flex flex-col h-full max-h-full bg-white dark:bg-neutral-900 border rounded-2xl overflow-hidden shadow-xl relative">
      {/* Audio Elements */}
      <audio ref={sentSoundRef} src="/sounds/sent.mp3" preload="auto" />
      <audio ref={receiveSoundRef} src="/sounds/receive.mp3" preload="auto" />

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:px-4 space-y-3 scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            {...msg}
            sender={msg.sender === socket.id ? "me" : "partner"}
            onDelete={() => {
              socket.emit("delete-message", {
                roomId,
                messageId: msg.id,
              });
              setMessages((prev) => prev.filter((m) => m.id !== msg.id));
            }}
            onEdit={(newContent: string) => {
              socket.emit("edit-message", {
                roomId,
                messageId: msg.id,
                content: newContent,
              });
              setMessages((prev) =>
                prev.map((m) => (m.id === msg.id ? { ...m, content: newContent } : m))
              );
            }}
            onReact={(reaction: string) => {
              socket.emit("react-message", {
                roomId,
                messageId: msg.id,
                reaction,
                user: socket.id,
              });
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msg.id
                    ? {
                        ...m,
                        reactions: {
                          ...m.reactions,
                          [socket.id]: reaction,
                        },
                      }
                    : m
                )
              );
            }}
          />
        ))}
        {partnerTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50 bg-white dark:bg-neutral-800 border rounded-xl shadow-xl p-3 w-72 max-h-64 overflow-y-auto grid grid-cols-6 sm:grid-cols-7 gap-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
          {topEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setInput((prev) => prev + emoji)}
              className="text-2xl hover:scale-125 transition-transform"
              aria-label={`Insert emoji ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Controls */}
      <div className="w-full border-t dark:border-neutral-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3 bg-white dark:bg-neutral-900">
        <button
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="text-2xl hover:scale-110 transition-transform"
          aria-label="Toggle emoji picker"
        >
          😊
        </button>

        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            debouncedTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="cursor-pointer text-xl" title="Send file">
          📎
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            hidden
            onChange={handleFile}
          />
        </label>

        <button
          onClick={sendText}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
}

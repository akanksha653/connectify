"use client";

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { ref, set, onValue, remove, update } from "firebase/database";
import { database } from "@/lib/firebaseConfig";
import debounce from "lodash/debounce";

import Message from "./Message";
import TypingIndicator from "./TypingIndicator";

interface ChatBoxProps {
  socket: any;
  roomId: string;
  userId: string;
  soundOn?: boolean;
  partnerName?: string;
  partnerAge?: string | number;
  partnerCountry?: string;
}

const topEmojis = [
  "😀", "😂", "😍", "🤣", "😊", "😭", "🥰", "😎", "👍", "🙏",
  "😘", "😅", "🎉", "🤔", "🙄", "😢", "🔥", "💯", "❤️", "👏"
];

export default function ChatBox({
  socket,
  roomId,
  userId,
  soundOn = true,
  partnerName = "Stranger",
  partnerAge,
  partnerCountry,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sentSoundRef = useRef<HTMLAudioElement>(null);
  const receiveSoundRef = useRef<HTMLAudioElement>(null);

  // Play sounds
  const playSound = (type: "sent" | "receive") => {
    if (!soundOn) return;
    const audioRef = type === "sent" ? sentSoundRef : receiveSoundRef;
    const play = async () => {
      try {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = 0.8;
        await audio.play();
      } catch {
        const ctx = new AudioContext();
        await ctx.resume();
      }
    };
    play();
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // Firebase listener
  useEffect(() => {
    if (!roomId) return;
    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    return onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      setMessages(Object.values(data));
    });
  }, [roomId]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const onTyping = ({ sender }: any) => {
      if (sender !== socket.id) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 3000);
      }
    };

    const onMessageUpdate = (msg: any) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === msg.id);
        if (exists) return prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
        return [...prev, msg];
      });
      if (msg.sender !== userId) playSound("receive");
    };

    const onMessageDelete = ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const onMessageReact = ({ messageId, reaction, user }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: { ...m.reactions, [user]: reaction } }
            : m
        )
      );
    };

    socket.on("typing", onTyping);
    socket.on("message-update", onMessageUpdate);
    socket.on("message-delete", onMessageDelete);
    socket.on("message-react", onMessageReact);

    return () => {
      socket.off("typing", onTyping);
      socket.off("message-update", onMessageUpdate);
      socket.off("message-delete", onMessageDelete);
      socket.off("message-react", onMessageReact);
    };
  }, [socket, userId]);

  // Debounced typing
  const debouncedTyping = useRef(
    debounce(() => {
      socket.emit("typing", { roomId, sender: socket.id });
    }, 300)
  ).current;

  // Send message
  const sendMessage = (content: string, type: "text" | "image" | "audio" | "video" = "text") => {
    if (!content.trim() || !roomId) return;

    const msgId = uuidv4();
    const msg = {
      id: msgId,
      sender: userId,
      content,
      timestamp: new Date().toISOString(),
      type,
      status: "sent",
      reactions: {},
    };

    set(ref(database, `rooms/${roomId}/messages/${msgId}`), msg).catch(console.error);
    socket.emit("message-update", msg);

    setMessages((prev) => [...prev, msg]);
    playSound("sent");
    setInput("");
    setShowEmojiPicker(false);
  };

  const sendText = () => sendMessage(input, "text");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const mime = file.type;

    let type: "image" | "audio" | "video" | undefined;
    if (mime.startsWith("image")) type = "image";
    else if (mime.startsWith("audio")) type = "audio";
    else if (mime.startsWith("video")) type = "video";

    if (type) sendMessage(url, type);
    else console.warn("Unsupported file type");
  };

  const handleDelete = (msgId: string) => {
    remove(ref(database, `rooms/${roomId}/messages/${msgId}`)).catch(console.error);
    socket.emit("message-delete", { messageId: msgId });
  };

  const handleEdit = (msgId: string, newContent: string) => {
    update(ref(database, `rooms/${roomId}/messages/${msgId}`), { content: newContent }).catch(console.error);
    socket.emit("message-update", { id: msgId, content: newContent, sender: userId });
  };

  const handleReact = (msgId: string, emoji: string) => {
    set(ref(database, `rooms/${roomId}/messages/${msgId}/reactions/${userId}`), emoji).catch(console.error);
    socket.emit("message-react", { messageId: msgId, reaction: emoji, user: userId });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 relative">
      <audio ref={sentSoundRef} src="/sounds/sent.mp3" preload="auto" />
      <audio ref={receiveSoundRef} src="/sounds/receive.mp3" preload="auto" />

      {/* Partner Info */}
      <div className="px-4 py-2 border-b text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700">
        <span className="font-medium text-blue-600 dark:text-blue-400">{partnerName}</span>
        {partnerAge && <span className="ml-1">({partnerAge})</span>}
        {partnerCountry && (
          <span className="ml-2 text-neutral-500 dark:text-neutral-400">from {partnerCountry}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 space-y-3 scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            {...msg}
            sender={msg.sender === userId ? "me" : "partner"}
            name={msg.sender === userId ? undefined : partnerName}
            age={msg.sender === userId ? undefined : partnerAge}
            country={msg.sender === userId ? undefined : partnerCountry}
            status={msg.status}
            onDelete={() => handleDelete(msg.id)}
            onEdit={(newContent: string) => handleEdit(msg.id, newContent)}
            onReact={(emoji: string) => handleReact(msg.id, emoji)}
          />
        ))}
        {partnerTyping && <TypingIndicator name={partnerName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-2 sm:left-4 z-50 bg-white dark:bg-neutral-800 border rounded-xl shadow-xl p-3 w-64 sm:w-72 max-h-64 overflow-y-auto grid grid-cols-6 gap-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
          {topEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setInput(prev => prev + emoji)}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Panel */}
      <div className="border-t dark:border-neutral-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 bg-white dark:bg-neutral-900">
        <button onClick={() => setShowEmojiPicker(prev => !prev)} className="text-2xl hover:scale-110 transition-transform">😊</button>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={e => { setInput(e.target.value); debouncedTyping(); }}
          onKeyDown={e => e.key === "Enter" && sendText()}
          className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="cursor-pointer text-xl" title="Send file">
          📎
          <input type="file" accept="image/*,audio/*,video/*" hidden onChange={handleFile} />
        </label>
        <button
          onClick={sendText}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg disabled:opacity-50 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { ref, set, onValue, remove, update, off } from "firebase/database";
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
  "😘", "😅", "🎉", "🤔", "🙄", "😢", "🔥", "💯", "❤️", "👏",
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

  // ---------- PLAY SOUND ----------
  const playSound = async (type: "sent" | "receive") => {
    if (!soundOn) return;
    try {
      const ref = type === "sent" ? sentSoundRef : receiveSoundRef;
      await ref.current?.play();
    } catch (err) {
      console.warn("Audio playback issue:", err);
    }
  };

  // ---------- AUTO SCROLL ----------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // ---------- FETCH MESSAGES (Firebase) ----------
  useEffect(() => {
    if (!roomId) return;
    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    const handleValue = (snapshot: any) => {
      const data = snapshot.val() || {};
      const msgs = Object.values(data)
        .map((m: any) => ({
          ...m,
          timestamp: m.timestamp || new Date().toISOString(),
        }))
        .sort(
          (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      setMessages(msgs);
    };
    onValue(messagesRef, handleValue);
    return () => off(messagesRef, "value", handleValue);
  }, [roomId]);

  // ---------- SOCKET EVENTS ----------
  useEffect(() => {
    if (!socket) return;

    socket.on("typing", ({ sender }: { sender: string }) => {
      if (sender !== userId) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 2000);
      }
    });

    socket.on("receive-message", (msg: any) => {
      setMessages((prev) => {
        const newMsg = { ...msg, status: "delivered", timestamp: msg.timestamp || new Date().toISOString() };
        const updated = [...prev, newMsg].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return updated;
      });
      socket.emit("seen-message", { roomId, messageId: msg.id });
      playSound("receive");
    });

    socket.on("message-status-update", ({ messageId, status }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status } : m))
      );
    });

    socket.on("message-deleted", ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socket.on("message-edited", ({ id, content }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content, edited: true } : m))
      );
    });

    socket.on("message-react", ({ messageId, reaction, user }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: { ...m.reactions, [user]: reaction } }
            : m
        )
      );
    });

    return () => {
      socket.off("typing");
      socket.off("receive-message");
      socket.off("message-status-update");
      socket.off("message-deleted");
      socket.off("message-edited");
      socket.off("message-react");
    };
  }, [socket, roomId, userId]);

  // ---------- TYPING ----------
  const debouncedTyping = useRef(
    debounce(() => socket?.emit("typing", { roomId, sender: userId }), 400)
  ).current;

  // ---------- SEND MESSAGE ----------
  const sendMessage = async (
    content: string,
    type: "text" | "image" | "audio" | "video" | "file" = "text"
  ) => {
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
    await set(ref(database, `rooms/${roomId}/messages/${msgId}`), msg);
    socket?.emit("send-message", { roomId, ...msg });
    playSound("sent");
    setInput("");
    setShowEmojiPicker(false);
  };

  // ---------- HANDLE FILE ----------
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      sendMessage(base64, file.type.startsWith("image") ? "image" : "file");
    };
    reader.readAsDataURL(file);
  };

  // ---------- DELETE / EDIT / REACT ----------
  const handleDelete = (id: string) => {
    remove(ref(database, `rooms/${roomId}/messages/${id}`));
    socket?.emit("delete-message", { roomId, messageId: id });
  };

  const handleEdit = (id: string, content: string) => {
    update(ref(database, `rooms/${roomId}/messages/${id}`), { content });
    socket?.emit("edit-message", { roomId, messageId: id, content });
  };

  const handleReact = (id: string, emoji: string) => {
    set(ref(database, `rooms/${roomId}/messages/${id}/reactions/${userId}`), emoji);
    socket?.emit("react-message", { roomId, messageId: id, reaction: emoji, user: userId });
  };

  // ---------- RENDER ----------
  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 relative">
      <audio ref={sentSoundRef} src="/sounds/sent.mp3" preload="auto" />
      <audio ref={receiveSoundRef} src="/sounds/receive.mp3" preload="auto" />

      {/* Header */}
      <div className="px-4 py-2 border-b text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700">
        <span className="font-medium text-blue-600 dark:text-blue-400">{partnerName}</span>
        {partnerAge && <span className="ml-1">({partnerAge})</span>}
        {partnerCountry && <span className="ml-2 text-neutral-500 dark:text-neutral-400">from {partnerCountry}</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 space-y-3">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            {...msg}
            sender={msg.sender === userId ? "me" : "partner"}
            name={msg.sender === userId ? undefined : partnerName}
            onDelete={() => handleDelete(msg.id)}
            onEdit={(newContent) => handleEdit(msg.id, newContent)}
            onReact={(emoji) => handleReact(msg.id, emoji)}
          />
        ))}
        {partnerTyping && <TypingIndicator name={partnerName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-3 bg-white dark:bg-neutral-800 border rounded-xl shadow-xl p-3 w-64 max-h-64 overflow-y-auto grid grid-cols-6 gap-2">
          {topEmojis.map((emoji) => (
            <button key={emoji} onClick={() => setInput((prev) => prev + emoji)} className="text-2xl hover:scale-125 transition-transform">
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t px-3 py-2 flex items-center gap-2">
        <button onClick={() => setShowEmojiPicker((p) => !p)} className="text-2xl hover:scale-110 transition-transform">
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
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          className="flex-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-lg focus:outline-none"
        />
        <label className="cursor-pointer text-xl" title="Send file">
          📎
          <input type="file" accept="image/*,audio/*,video/*" hidden onChange={handleFile} />
        </label>
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

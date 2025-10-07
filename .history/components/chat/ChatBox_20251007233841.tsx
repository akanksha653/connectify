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
  "😀","😂","😍","🤣","😊","😭","🥰","😎","👍","🙏",
  "😘","😅","🎉","🤔","🙄","😢","🔥","💯","❤️","👏"
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

  // ------------------ PLAY SOUND ------------------
  const playSound = async (type: "sent" | "receive") => {
    if (!soundOn) return;
    try {
      const ref = type === "sent" ? sentSoundRef : receiveSoundRef;
      const audio = ref.current;
      if (audio) {
        audio.volume = 0.8;
        await audio.play();
      }
    } catch (err) {
      console.warn("Audio playback issue:", err);
    }
  };

  // ------------------ AUTO SCROLL ------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // ------------------ FIREBASE LISTENER ------------------
  useEffect(() => {
    if (!roomId) return;
    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      setMessages(Object.values(data));
    });
    return () => off(messagesRef);
  }, [roomId]);

  // ------------------ SOCKET EVENTS ------------------
  useEffect(() => {
    if (!socket) return;

    socket.on("typing", ({ sender }) => {
      if (sender !== userId) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 2500);
      }
    });

    socket.on("receive-message", ({ message, sender }) => {
      setMessages((prev) => [...prev, message]);
      playSound("receive");
    });

    socket.on("message-deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socket.on("message-edited", ({ messageId, content }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, edited: true } : m))
      );
    });

    socket.on("message-reacted", ({ messageId, reaction, user }) => {
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
      socket.off("message-deleted");
      socket.off("message-edited");
      socket.off("message-reacted");
    };
  }, [socket, userId]);

  // ------------------ TYPING ------------------
  const debouncedTyping = useRef(
    debounce(() => {
      socket.emit("typing", { roomId, sender: userId });
    }, 400)
  ).current;

  // ------------------ SEND MESSAGE ------------------
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

    try {
      await set(ref(database, `rooms/${roomId}/messages/${msgId}`), msg);
      socket.emit("send-message", { roomId, message: msg });
      setMessages((prev) => [...prev, msg]);
      playSound("sent");
      setInput("");
      setShowEmojiPicker(false);
    } catch (err) {
      console.error("Send error:", err);
    }
  };

  // ------------------ FILE UPLOAD ------------------
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

  // ------------------ DELETE / EDIT / REACT ------------------
  const handleDelete = (msgId: string) => {
    remove(ref(database, `rooms/${roomId}/messages/${msgId}`)).catch(console.error);
    socket.emit("delete-message", { roomId, messageId: msgId });
  };

  const handleEdit = (msgId: string, newContent: string) => {
    update(ref(database, `rooms/${roomId}/messages/${msgId}`), {
      content: newContent,
    }).catch(console.error);
    socket.emit("edit-message", { roomId, messageId: msgId, content: newContent });
  };

  const handleReact = (msgId: string, emoji: string) => {
    set(ref(database, `rooms/${roomId}/messages/${msgId}/reactions/${userId}`), emoji).catch(console.error);
    socket.emit("react-message", { roomId, messageId: msgId, reaction: emoji, user: userId });
  };

  // ------------------ RENDER ------------------
  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 relative">
      <audio ref={sentSoundRef} src="/sounds/sent.mp3" preload="auto" />
      <audio ref={receiveSoundRef} src="/sounds/receive.mp3" preload="auto" />

      {/* Partner Info */}
      <div className="px-4 py-2 border-b text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700">
        <span className="font-medium text-blue-600 dark:text-blue-400">{partnerName}</span>
        {partnerAge && <span className="ml-1">({partnerAge})</span>}
        {partnerCountry && (
          <span className="ml-2 text-neutral-500 dark:text-neutral-400">
            from {partnerCountry}
          </span>
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
              onClick={() => setInput((prev) => prev + emoji)}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="border-t dark:border-neutral-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 bg-white dark:bg-neutral-900">
        <button
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="text-2xl hover:scale-110 transition-transform"
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
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input, "text")}
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
          onClick={() => sendMessage(input, "text")}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg disabled:opacity-50 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}

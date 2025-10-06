"use client";

import React, { useState, useEffect, useRef } from "react";
import { ref, push, onChildAdded, onChildChanged, onChildRemoved, update, get } from "firebase/database";
import { database } from "@/lib/firebaseConfig";
import { v4 as uuidv4 } from "uuid";
const debounce = require("lodash/debounce");

import Message from "./Message";
import TypingIndicator from "./TypingIndicator";

interface ChatBoxProps {
  roomId: string;
  userId: string; // current user uid
  soundOn?: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  type: "text" | "image" | "audio" | "video" | "file";
  timestamp: string;
  status: "sent" | "seen";
  reactions?: Record<string, string>;
  name?: string;
}

export default function ChatBox({ roomId, userId, soundOn = true }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerName, setPartnerName] = useState("Stranger");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sentSoundRef = useRef<HTMLAudioElement>(null);
  const receiveSoundRef = useRef<HTMLAudioElement>(null);

  // ---------- Sounds ----------
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

  // ---------- Scroll to bottom ----------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // ---------- Fetch partner info ----------
  useEffect(() => {
    if (!roomId || !userId) return;

    const fetchPartner = async () => {
      try {
        const roomRef = ref(database, `rooms/${roomId}/users`);
        const snapshot = await get(roomRef);
        if (snapshot.exists()) {
          const users = snapshot.val();
          const partnerUid = Object.keys(users).find((uid) => uid !== userId);
          if (partnerUid) {
            setPartnerId(partnerUid);
            const userRef = ref(database, `users/${partnerUid}`);
            const userSnap = await get(userRef);
            if (userSnap.exists()) setPartnerName(userSnap.val().name || "Stranger");
          }
        }
      } catch (err) {
        console.error("Error fetching partner info:", err);
      }
    };

    fetchPartner();
  }, [roomId, userId]);

  // ---------- Listen for messages ----------
  useEffect(() => {
    if (!roomId) return;

    const messagesRef = ref(database, `rooms/${roomId}/messages`);

    const handleNewMessage = onChildAdded(messagesRef, (snap) => {
      const msg = snap.val() as ChatMessage;
      setMessages((prev) => [...prev, msg]);
      if (msg.sender !== userId) playSound("receive");
    });

    const handleMessageChange = onChildChanged(messagesRef, (snap) => {
      const updated = snap.val() as ChatMessage;
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
    });

    const handleMessageRemove = onChildRemoved(messagesRef, (snap) => {
      const removed = snap.val() as ChatMessage;
      setMessages((prev) => prev.filter((m) => m.id !== removed.id));
    });

    return () => {
      messagesRef.off();
    };
  }, [roomId, userId, soundOn]);

  // ---------- Typing indicator ----------
  const debouncedTyping = useRef(
    debounce(() => {
      const typingRef = ref(database, `rooms/${roomId}/typing/${userId}`);
      update(typingRef, { typing: true, timestamp: Date.now() });
      setTimeout(() => update(typingRef, { typing: false }), 2000);
    }, 300)
  ).current;

  useEffect(() => {
    if (!roomId) return;
    const typingRef = ref(database, `rooms/${roomId}/typing`);
    const unsub = onChildChanged(typingRef, (snap) => {
      const data = snap.val();
      if (snap.key !== userId) setPartnerTyping(data.typing);
    });
    return () => unsub();
  }, [roomId, userId]);

  // ---------- Send message ----------
  const sendMessage = (content: string, type: ChatMessage["type"] = "text") => {
    if (!content.trim()) return;

    const newMsg: ChatMessage = {
      id: uuidv4(),
      sender: userId,
      content,
      type,
      timestamp: new Date().toISOString(),
      status: "sent",
      reactions: {},
      name: "You",
    };

    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    push(messagesRef, newMsg);
    setMessages((prev) => [...prev, newMsg]);
    playSound("sent");
    setInput("");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    let type: ChatMessage["type"] = "file";
    if (file.type.startsWith("image")) type = "image";
    else if (file.type.startsWith("audio")) type = "audio";
    else if (file.type.startsWith("video")) type = "video";
    sendMessage(url, type);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 relative">
      {/* Sounds */}
      <audio ref={sentSoundRef} src="/sounds/sent.mp3" preload="auto" />
      <audio ref={receiveSoundRef} src="/sounds/receive.mp3" preload="auto" />

      {/* Partner Info */}
      <div className="px-4 py-2 border-b text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700">
        <span className="font-medium text-blue-600 dark:text-blue-400">{partnerName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 space-y-3 scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            {...msg}
            sender={msg.sender === userId ? "me" : "partner"}
            name={msg.sender === userId ? "You" : partnerName}
            onDelete={() => {
              const msgRef = ref(database, `rooms/${roomId}/messages/${msg.id}`);
              msgRef.remove();
            }}
          />
        ))}
        {partnerTyping && <TypingIndicator name={partnerName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t dark:border-neutral-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 bg-white dark:bg-neutral-900">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            debouncedTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="cursor-pointer text-xl" title="Send file">
          📎
          <input type="file" accept="image/*,audio/*,video/*" hidden onChange={handleFile} />
        </label>
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg disabled:opacity-50 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}

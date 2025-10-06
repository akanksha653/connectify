// components/chat/ChatBox.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ref as dbRef, set, onValue, remove, update } from "firebase/database";
import { database } from "@/lib/firebaseConfig";
import debounce from "lodash/debounce";

import Message from "./Message";
import TypingIndicator from "./TypingIndicator";
import socketClient from "@/lib/socketClient";

interface ChatBoxProps {
  socket?: any; // optional: you can also import socketClient.getSocket()
  roomId: string;
  userId: string;
  soundOn?: boolean;
  partnerName?: string;
  partnerAge?: string | number;
  partnerCountry?: string;
}

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const sentSoundRef = useRef<HTMLAudioElement | null>(null);
  const receiveSoundRef = useRef<HTMLAudioElement | null>(null);

  const sock = socket ?? socketClient.getSocket();

  // sounds helper
  const playSound = async (type: "sent" | "receive") => {
    if (!soundOn) return;
    const refEl = type === "sent" ? sentSoundRef.current : receiveSoundRef.current;
    try {
      if (!refEl) return;
      refEl.volume = 0.8;
      await refEl.play();
    } catch {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      await ctx.resume();
    }
  };

  // scroll to bottom on messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // listen firebase messages (persistent source of truth)
  useEffect(() => {
    if (!roomId) return;
    const refPath = dbRef(database, `rooms/${roomId}/messages`);
    const off = onValue(refPath, (snap) => {
      const val = snap.val() || {};
      // messages stored keyed by id; convert to array and sort by timestamp
      const arr = Object.values(val).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(arr);
    });
    return () => off();
  }, [roomId]);

  // socket real-time events (instant)
  useEffect(() => {
    if (!sock) return;

    const onTyping = ({ sender }: any) => {
      if (sender !== sock.id) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 3000);
      }
    };

    const onReceive = ({ message }: any) => {
      // ensure firebase persisted version will also arrive; still update UI instantly
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (message.sender !== userId) playSound("receive");
    };

    const onDelete = ({ messageId }: any) => setMessages((p) => p.filter((m) => m.id !== messageId));
    const onEdit = ({ messageId, content }: any) =>
      setMessages((p) => p.map((m) => (m.id === messageId ? { ...m, content } : m)));
    const onReact = ({ messageId, reaction, user }: any) =>
      setMessages((p) => p.map((m) => (m.id === messageId ? { ...m, reactions: { ...m.reactions, [user]: reaction } } : m)));

    sock.on("typing", onTyping);
    sock.on("receive-message", onReceive);
    sock.on("message-deleted", onDelete);
    sock.on("message-edited", onEdit);
    sock.on("message-react", onReact);

    return () => {
      sock.off("typing", onTyping);
      sock.off("receive-message", onReceive);
      sock.off("message-deleted", onDelete);
      sock.off("message-edited", onEdit);
      sock.off("message-react", onReact);
    };
  }, [sock, userId]);

  // typing debounce
  const debouncedTyping = useRef(
    debounce(() => {
      sock?.emit("typing", { roomId, sender: sock?.id });
    }, 300)
  ).current;

  // send message: persist to firebase and broadcast via socket
  const sendMessage = async (content: string, type: "text" | "image" | "audio" | "video" | "file" = "text") => {
    if (!content?.trim() || !roomId) return;
    const msgId = uuidv4();
    const msg = {
      id: msgId,
      sender: userId,
      content,
      type,
      timestamp: new Date().toISOString(),
      status: "sent",
      reactions: {},
    };

    // Persist to Firebase
    await set(dbRef(database, `rooms/${roomId}/messages/${msgId}`), msg).catch((e) => {
      console.error("Firebase set error:", e);
    });

    // Emit via socket for instant update
    sock?.emit("send-message", { roomId, message: msg });

    setInput("");
    setShowEmojiPicker(false);
    playSound("sent");
  };

  const sendText = () => sendMessage(input, "text");

  // simple file -> blob preview (for real apps, upload to storage and use returned URL)
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const mime = file.type;
    let t: any = "file";
    if (mime.startsWith("image")) t = "image";
    else if (mime.startsWith("audio")) t = "audio";
    else if (mime.startsWith("video")) t = "video";
    sendMessage(url, t);
  };

  // edit
  const handleEdit = async (messageId: string, newContent: string) => {
    await update(dbRef(database, `rooms/${roomId}/messages/${messageId}`), { content: newContent }).catch(console.error);
    sock?.emit("edit-message", { roomId, messageId, content: newContent });
  };

  // delete
  const handleDelete = async (messageId: string) => {
    await remove(dbRef(database, `rooms/${roomId}/messages/${messageId}`)).catch(console.error);
    sock?.emit("delete-message", { roomId, messageId });
  };

  // react
  const handleReact = async (messageId: string, emoji: string) => {
    await set(dbRef(database, `rooms/${roomId}/messages/${messageId}/reactions/${userId}`), emoji).catch(console.error);
    sock?.emit("react-message", { roomId, messageId, reaction: emoji, user: userId });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 relative">
      <audio ref={sentSoundRef} src="/sounds/sent.mp3" preload="auto" />
      <audio ref={receiveSoundRef} src="/sounds/receive.mp3" preload="auto" />

      {/* header */}
      <div className="px-4 py-2 border-b text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700">
        <span className="font-medium text-blue-600 dark:text-blue-400">{partnerName}</span>
        {partnerAge && <span className="ml-1">({partnerAge})</span>}
        {partnerCountry && <span className="ml-2 text-neutral-500 dark:text-neutral-400">from {partnerCountry}</span>}
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 space-y-3">
        {messages.map((m) => (
          <Message
            key={m.id}
            id={m.id}
            sender={m.sender === userId ? "me" : "partner"}
            content={m.content}
            timestamp={m.timestamp}
            status={m.status}
            type={m.type}
            reactions={m.reactions}
            name={m.sender === userId ? undefined : partnerName}
            age={m.sender === userId ? undefined : partnerAge}
            country={m.sender === userId ? undefined : partnerCountry}
            onDelete={() => handleDelete(m.id)}
            onEdit={(newContent) => handleEdit(m.id, newContent)}
            onReact={(emoji) => handleReact(m.id, emoji)}
          />
        ))}
        {partnerTyping && <TypingIndicator name={partnerName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* emoji picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-2 sm:left-4 z-50 bg-white dark:bg-neutral-800 border rounded-xl shadow-xl p-3 w-64 sm:w-72 max-h-64 overflow-y-auto grid grid-cols-6 gap-2">
          {["😀","😂","😍","👍","🔥","❤️","😭","🎉","🙏","👏","😅","😘"].map((e) => (
            <button key={e} onClick={() => setInput((p) => p + e)} className="text-2xl">{e}</button>
          ))}
        </div>
      )}

      {/* input */}
      <div className="border-t dark:border-neutral-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2">
        <button onClick={() => setShowEmojiPicker((s) => !s)} className="text-2xl">😊</button>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            debouncedTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          className="flex-1 px-3 py-2 rounded-lg border"
        />
        <label className="cursor-pointer text-xl" title="Send file">
          📎
          <input type="file" accept="image/*,audio/*,video/*" hidden onChange={handleFile} />
        </label>
        <button onClick={sendText} disabled={!input.trim()} className="bg-blue-600 text-white px-3 py-2 rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
}

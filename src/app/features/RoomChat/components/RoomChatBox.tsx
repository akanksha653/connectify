"use client";

import React, { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  user: string;
  text: string;
  edited?: boolean;
  reactions?: { [user: string]: string };
}

interface Props {
  socket: any;
  roomId: string;
  userName: string;
}

export default function ChatBox({ socket, roomId, userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom if near bottom
  const scrollToBottom = () => {
    if (!messagesEndRef.current) return;
    const el = messagesEndRef.current.parentElement;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => scrollToBottom(), [messages]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);
    const handleTyping = ({ sender }: { sender: string }) => {
      setTypingUsers((prev) => (prev.includes(sender) ? prev : [...prev, sender]));
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== sender));
        typingTimeout.current = null;
      }, 2000);
    };
    const handleEdit = ({ messageId, content }: any) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, text: content, edited: true } : m))
      );
    const handleDelete = ({ messageId }: any) => setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const handleReact = ({ messageId, user: reactionUser, reaction }: any) =>
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: { ...(m.reactions || {}), [reactionUser]: reaction } }
            : m
        )
      );

    socket.on("room-message", handleRoomMessage);
    socket.on("typing", handleTyping);
    socket.on("edit-message", handleEdit);
    socket.on("delete-message", handleDelete);
    socket.on("react-message", handleReact);

    return () => {
      socket.off("room-message", handleRoomMessage);
      socket.off("typing", handleTyping);
      socket.off("edit-message", handleEdit);
      socket.off("delete-message", handleDelete);
      socket.off("react-message", handleReact);
    };
  }, [socket]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const msg: Message = { id: crypto.randomUUID(), user: userName, text, reactions: {} };
    socket.emit("room-message", { roomId, ...msg });
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  const handleTypingInput = (text: string) => {
    setInput(text);
    if (!socket) return;
    socket.emit("typing", { roomId, sender: userName });
  };

  const editMessage = (id: string) => {
    const newText = prompt("Edit your message:");
    if (!newText) return;
    socket.emit("edit-message", { roomId, messageId: id, content: newText });
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: newText, edited: true } : m)));
  };

  const deleteMessage = (id: string) => {
    if (!confirm("Delete this message?")) return;
    socket.emit("delete-message", { roomId, messageId: id });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const reactMessage = (id: string, reaction: string) => {
    socket.emit("react-message", { roomId, messageId: id, reaction, user: userName });
  };

  return (
    <div className="flex flex-col h-full border rounded p-2 bg-white dark:bg-neutral-900">
      <div className="flex-1 overflow-y-auto mb-2 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="text-sm flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <strong>{m.user}:</strong>
              {m.user === userName && (
                <div className="flex gap-1">
                  <button onClick={() => editMessage(m.id)} className="text-xs text-blue-500 hover:underline">Edit</button>
                  <button onClick={() => deleteMessage(m.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              )}
            </div>
            <span>
              {m.text} {m.edited && <em className="text-gray-400">(edited)</em>}
            </span>
            {m.reactions && (
              <div className="flex gap-1 text-xs flex-wrap">
                {Object.entries(m.reactions).map(([user, react]) => (
                  <span key={user} className="bg-gray-200 dark:bg-neutral-700 px-1 rounded">
                    {react} <strong>{user}</strong>
                  </span>
                ))}
                <button onClick={() => reactMessage(m.id, "❤️")}>❤️</button>
                <button onClick={() => reactMessage(m.id, "😂")}>😂</button>
                <button onClick={() => reactMessage(m.id, "🔥")}>🔥</button>
              </div>
            )}
          </div>
        ))}
        {typingUsers.length > 0 && (
          <p className="text-xs italic text-gray-500">{typingUsers.join(", ")} typing...</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => handleTypingInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}

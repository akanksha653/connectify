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

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen to socket events
  useEffect(() => {
    if (!socket) return;

    // Receive new messages
    socket.on("room-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Typing indicator
    socket.on("typing", ({ sender }: { sender: string }) => {
      setTypingUsers((prev) => {
        if (!prev.includes(sender)) return [...prev, sender];
        return prev;
      });

      // Remove typing after 2s
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== sender));
      }, 2000);
    });

    // Message edits
    socket.on("edit-message", ({ messageId, content }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, text: content, edited: true } : m
        )
      );
    });

    // Message deletions
    socket.on("delete-message", ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    // Reactions
    socket.on(
      "react-message",
      ({ messageId, user: reactionUser, reaction }: any) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId) {
              return {
                ...m,
                reactions: { ...(m.reactions || {}), [reactionUser]: reaction },
              };
            }
            return m;
          })
        );
      }
    );

    return () => {
      socket.off("room-message");
      socket.off("typing");
      socket.off("edit-message");
      socket.off("delete-message");
      socket.off("react-message");
    };
  }, [socket]);

  // Send message
  const sendMessage = () => {
    if (!input.trim()) return;

    const msg: Message = {
      id: crypto.randomUUID(),
      user: userName,
      text: input.trim(),
      reactions: {},
    };

    socket.emit("room-message", { roomId, ...msg });
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  // Handle typing
  const handleTyping = (text: string) => {
    setInput(text);
    if (!socket) return;

    socket.emit("typing", { roomId, sender: userName });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      // Stop typing indicator after delay
      typingTimeout.current = null;
    }, 2000);
  };

  // Edit message
  const editMessage = (id: string) => {
    const newText = prompt("Edit your message:");
    if (!newText) return;
    socket.emit("edit-message", { roomId, messageId: id, content: newText });
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: newText, edited: true } : m))
    );
  };

  // Delete message
  const deleteMessage = (id: string) => {
    if (!confirm("Delete this message?")) return;
    socket.emit("delete-message", { roomId, messageId: id });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  // React to message
  const reactMessage = (id: string, reaction: string) => {
    socket.emit("react-message", { roomId, messageId: id, reaction, user: userName });
  };

  return (
    <div className="flex flex-col h-full border rounded p-2 bg-white dark:bg-neutral-900">
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map((m) => (
          <div key={m.id} className="mb-1 text-sm flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <strong>{m.user}:</strong>
              {m.user === userName && (
                <div className="flex gap-1">
                  <button onClick={() => editMessage(m.id)} className="text-xs text-blue-500">Edit</button>
                  <button onClick={() => deleteMessage(m.id)} className="text-xs text-red-500">Delete</button>
                </div>
              )}
            </div>
            <span>
              {m.text} {m.edited && <em className="text-gray-400">(edited)</em>}
            </span>
            {m.reactions && (
              <div className="flex gap-1 text-xs">
                {Object.entries(m.reactions).map(([user, react]) => (
                  <span key={user}>
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
          <p className="text-xs italic text-gray-500">
            {typingUsers.join(", ")} typing...
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
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

"use client";

import React, { useState } from "react";

interface MessageProps {
  id: string;
  sender: "me" | "partner";
  content: string;
  timestamp: string;
  status?: "sent" | "delivered" | "seen";
  type?: "text" | "image" | "audio" | "video";
  reactions?: { [userId: string]: string };
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  onReact?: (reaction: string) => void;
}

const topEmojis = ["😂", "❤️", "🔥", "👍", "😍", "😭"];

export default function Message({
  sender,
  content,
  timestamp,
  status,
  type = "text",
  reactions = {},
  onDelete,
  onEdit,
  onReact,
}: MessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showReactions, setShowReactions] = useState(false);

  const isSender = sender === "me";

  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleEditSubmit = () => {
    if (editedContent.trim()) {
      onEdit?.(editedContent.trim());
      setIsEditing(false);
    }
  };

  const renderMedia = () => {
    switch (type) {
      case "image":
        return (
          <img
            src={content}
            alt="Image"
            className="rounded-xl max-w-xs mt-2 border border-gray-300 dark:border-gray-600"
          />
        );
      case "audio":
        return <audio controls src={content} className="mt-2 w-full" />;
      case "video":
        return (
          <video
            controls
            src={content}
            className="mt-2 w-full rounded-lg max-h-64"
          />
        );
      default:
        return <p className="whitespace-pre-wrap break-words">{content}</p>;
    }
  };

  return (
    <div className="w-full px-4 py-3 flex">
      <div
        className={`flex flex-col gap-1 ${
          isSender ? "items-end ml-auto" : "items-start mr-auto"
        } w-full max-w-[85%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-[50%]`}
      >
        {/* Sender & Time */}
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
          {isSender ? "You" : "Stranger"} • {time}
        </div>

        {/* Message bubble */}
        <div
          className={`relative group px-4 py-2 rounded-2xl text-sm shadow-sm transition-all ${
            isSender
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-bl-md"
          }`}
        >
          {isEditing ? (
            <div className="flex flex-col gap-1">
              <input
                type="text"
                className="text-black px-3 py-2 rounded-md text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-2 text-xs">
                <button
                  onClick={handleEditSubmit}
                  className="text-green-600 hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditedContent(content);
                    setIsEditing(false);
                  }}
                  className="text-red-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {type === "text" ? <span>{content}</span> : renderMedia()}

              {/* Reactions */}
              {Object.values(reactions).length > 0 && (
                <div className="mt-2 flex gap-1 text-xl flex-wrap">
                  {Object.values(reactions).map((emoji, idx) => (
                    <span key={idx}>{emoji}</span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Hover Buttons */}
          {!isEditing && (
            <div
              className={`absolute top-1 ${
                isSender ? "right-2 text-white" : "left-2 text-black dark:text-white"
              } hidden group-hover:flex gap-1 text-sm z-10`}
            >
              {isSender && onEdit && (
                <button onClick={() => setIsEditing(true)} title="Edit">
                  ✏️
                </button>
              )}
              {isSender && onDelete && (
                <button onClick={onDelete} title="Delete">
                  🗑️
                </button>
              )}
              {onReact && (
                <button
                  onClick={() => setShowReactions((s) => !s)}
                  title="React"
                >
                  😊
                </button>
              )}
            </div>
          )}

          {/* Emoji Reaction Picker */}
          {showReactions && (
            <div
              className={`absolute top-full mt-2 z-50 bg-white dark:bg-neutral-800 p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg flex flex-wrap gap-2 ${
                isSender ? "right-0" : "left-0"
              }`}
            >
              {topEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact?.(emoji);
                    setShowReactions(false);
                  }}
                  className="text-xl hover:scale-125 transition-transform duration-150"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Status */}
        {isSender && status && (
          <div className="text-[10px] text-neutral-400 mt-0.5">
            {status === "seen"
              ? "Seen ✅"
              : status === "delivered"
              ? "Delivered ✔️"
              : "Sent"}
          </div>
        )}
      </div>
    </div>
  );
}

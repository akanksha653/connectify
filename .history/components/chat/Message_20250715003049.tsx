"use client";

import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "@react-hook/window-size";

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
  name?: string;
  age?: string | number;
}

const topEmojis = ["😂", "❤️", "🔥", "👍", "😍", "😭"];

export default function Message({
  id,
  sender,
  content,
  timestamp,
  status,
  type = "text",
  reactions = {},
  onDelete,
  onEdit,
  onReact,
  name,
  age,
}: MessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showReactions, setShowReactions] = useState(false);
  const [burst, setBurst] = useState(false);
  const [width, height] = useWindowSize();

  const isSender = sender === "me";

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const handleEditSubmit = () => {
    const trimmed = editedContent.trim();
    if (trimmed && trimmed !== content) {
      onEdit?.(trimmed);
    }
    setIsEditing(false);
  };

  const triggerConfetti = () => {
    if (!isSender) {
      setBurst(true);
      setTimeout(() => setBurst(false), 1000);
    }
  };

  const renderMedia = () => {
    switch (type) {
      case "image":
        return (
          <img
            src={content}
            alt="Image"
            className="rounded-2xl max-w-full mt-2 border border-gray-300 dark:border-gray-600"
          />
        );
      case "audio":
        return <audio controls src={content} className="mt-2 w-full" />;
      case "video":
        return (
          <video
            controls
            src={content}
            className="mt-2 w-full rounded-2xl max-h-64"
          />
        );
      default:
        return <p className="whitespace-pre-wrap break-words">{content}</p>;
    }
  };

  return (
    <div className="relative w-full px-3 py-2 flex">
      {/* Confetti burst for receiver only */}
      {burst && !isSender && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={100}
        />
      )}

      <div
        className={`flex flex-col ${
          isSender ? "items-end ml-auto" : "items-start mr-auto"
        } w-full max-w-[90%] sm:max-w-[75%] md:max-w-[60%]`}
      >
        {/* Name + Time */}
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
          {isSender ? (
            <>You • {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
          ) : (
            <>
              {name || "Stranger"}
              {age ? ` (${age})` : ""} •{" "}
              {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </>
          )}
        </div>

        {/* Message bubble */}
        <div
          className={`relative group px-4 py-2 rounded-2xl text-sm shadow-md transition-all duration-200 ${
            isSender
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-bl-md"
          }`}
        >
          {/* Editing input */}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                className="text-black px-3 py-2 rounded-md text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                autoFocus
                placeholder="Edit your message"
              />
              <div className="flex justify-end gap-3 text-xs">
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
                <div className="mt-2 flex flex-wrap gap-1 text-xl">
                  {Object.values(reactions).map((emoji, idx) => (
                    <span
                      key={idx}
                      className="hover:scale-110 transition-transform"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          {!isEditing && (
            <div
              className={`absolute top-1 ${
                isSender
                  ? "right-2 text-white"
                  : "left-2 text-black dark:text-white"
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
              className={`absolute top-full mt-2 z-50 bg-white dark:bg-neutral-800 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-xl shadow-lg flex flex-row gap-2 ${
                isSender ? "right-0" : "left-0"
              }`}
            >
              {topEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact?.(emoji);
                    triggerConfetti();
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
          <div className="text-[10px] text-neutral-400 mt-1">
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

"use client";

import React, { useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface MessageProps {
  id: string;
  sender: "me" | "partner";
  content: string;
  timestamp: string;
  status?: "sent" | "delivered" | "seen";
  type?: "text" | "image" | "audio" | "video";
  reactions?: { [userId: string]: string };

  // Action handlers from ChatBox
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  onReact?: (reaction: string) => void;
}

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
            className="rounded max-w-xs mt-2 object-cover border border-gray-200 dark:border-gray-600"
          />
        );
      case "audio":
        return <audio controls src={content} className="mt-2 w-full" />;
      case "video":
        return (
          <video
            controls
            src={content}
            className="mt-2 w-full rounded max-h-64 object-cover"
          />
        );
      default:
        return <p className="whitespace-pre-wrap">{content}</p>;
    }
  };

  return (
    <div className={`flex flex-col ${sender === "me" ? "items-end" : "items-start"} w-full px-2`}>
      {/* Sender and Timestamp */}
      <div className="flex items-center gap-2 text-xs mb-1 text-neutral-500 dark:text-neutral-400">
        <span>{sender === "me" ? "You" : "Stranger"}</span>
        <span className="text-[10px]">{time}</span>
      </div>

      {/* Message bubble */}
      <div
        className={`relative group px-4 py-2 rounded-lg text-sm break-words shadow-md ${
          sender === "me"
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-bl-none"
        } max-w-[85%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-[50%]`}
      >
        {isEditing ? (
  <div className="flex flex-col gap-1">
    <input
      type="text" // ✅ Required to prevent React error
      className="text-black px-2 py-1 rounded text-sm border border-gray-300 focus:outline-none focus:ring focus:ring-blue-500"
      value={editedContent}
      onChange={(e) => setEditedContent(e.target.value)}
      autoFocus // Optional: puts focus on input when editing starts
    />
    <div className="flex gap-2 justify-end text-xs mt-1">
      <button
        onClick={handleEditSubmit}
        className="text-green-600 hover:underline"
      >
        Save
      </button>
      <button
        onClick={() => {
          setEditedContent(content); // reset input
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
    {/* Message content */}
    {type === "text" ? (
      <span>{content}</span>
    ) : (
      renderMedia()
    )}

    {/* Reactions */}
    {Object.values(reactions).length > 0 && (
      <div className="mt-1 flex gap-1 text-lg flex-wrap">
        {Object.values(reactions).map((emoji, index) => (
          <span key={index}>{emoji}</span>
        ))}
      </div>
    )}
  </>
)}

        {/* Action buttons (edit/delete/react) only for "me" */}
        {sender === "me" && !isEditing && (
          <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 text-white text-sm z-10">
            {onEdit && <button onClick={() => setIsEditing(true)} title="Edit">✏️</button>}
            {onDelete && <button onClick={onDelete} title="Delete">🗑️</button>}
            {onReact && <button onClick={() => setShowReactions((s) => !s)} title="React">😊</button>}
          </div>
        )}

        {/* Emoji Reaction Picker */}
        {showReactions && (
          <div className="absolute z-50 top-full right-0 mt-2">
            <Picker
              data={data}
              theme="auto"
              onEmojiSelect={(e: any) => {
                onReact?.(e.native);
                setShowReactions(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Seen / Delivered Status */}
      {sender === "me" && status && (
        <div className="text-[10px] text-right text-neutral-400 mt-1">
          {status === "seen" ? "Seen ✅" : status === "delivered" ? "Delivered ✔️" : "Sent"}
        </div>
      )}
    </div>
  );
}

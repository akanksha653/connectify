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
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  const renderMedia = () => {
    if (type === "image") return <img src={content} className="rounded max-w-xs mt-1" />;
    if (type === "audio") return <audio controls src={content} className="mt-1 w-full" />;
    if (type === "video") return <video controls src={content} className="mt-1 w-full rounded" />;
    return content;
  };

  return (
    <div className={`flex flex-col ${sender === "me" ? "items-end" : "items-start"} w-full px-2`}>
      <div className="flex items-center gap-2 text-xs mb-1 text-neutral-500 dark:text-neutral-400">
        <span>{sender === "me" ? "You" : "Stranger"}</span>
        <span className="text-[10px]">{time}</span>
      </div>

      <div
        className={`relative group px-4 py-2 rounded-lg text-sm break-words shadow ${
          sender === "me"
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-bl-none"
        } max-w-[85%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-[50%]`}
      >
        {/* Editable Text */}
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <input
              className="text-black px-2 py-1 rounded text-sm"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
            />
            <div className="flex gap-2 justify-end text-xs">
              <button onClick={handleEditSubmit} className="text-green-500">Save</button>
              <button onClick={() => setIsEditing(false)} className="text-red-500">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {type === "text" ? content : renderMedia()}
            {/* Reactions */}
            {Object.values(reactions).length > 0 && (
              <div className="mt-1 flex gap-1 text-lg">
                {Object.values(reactions).map((r, i) => (
                  <span key={i}>{r}</span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Action buttons (edit/delete/react) only for "me" */}
        {sender === "me" && !isEditing && (
          <div className="absolute right-0 top-0 hidden group-hover:flex gap-2 px-2 py-1 text-xs text-white">
            {onEdit && <button onClick={() => setIsEditing(true)}>✏️</button>}
            {onDelete && <button onClick={onDelete}>🗑️</button>}
            {onReact && <button onClick={() => setShowReactions(!showReactions)}>❤️</button>}
          </div>
        )}

        {/* Reaction Picker */}
        {showReactions && (
          <div className="absolute z-50 top-full mt-1 right-0">
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

      {/* Message Status (Only for "me") */}
      {sender === "me" && status && (
        <div className="text-[10px] text-right text-neutral-400 mt-1">
          {status === "seen"
            ? "Seen ✅"
            : status === "delivered"
            ? "Delivered ✔️"
            : "Sent"}
        </div>
      )}
    </div>
  );
}

// features/RoomSystem/components/RoomChatBox.tsx
import React, { useState, useRef } from "react";
import { useRoomChat } from "../hooks/useRoomChat";

export default function RoomChatBox({ roomId }: { roomId: string }) {
  const { messages, send, sendFile } = useRoomChat(roomId);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onSend = () => {
    if (!text.trim()) return;
    send({ senderId: "me", senderName: "Me", content: text, type: "text" });
    setText("");
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendFile(file, "Me");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-80 border rounded p-2">
      <div className="flex-1 overflow-auto space-y-2 mb-2">
        {messages.map((m) => (
          <div key={m.id} className="border rounded p-2">
            <div className="text-xs text-gray-500">{m.senderName}</div>
            {m.type === "file" ? (
              <a href={m.content} target="_blank" className="text-blue-600">{m.fileName || "file"}</a>
            ) : (
              <div>{m.content}</div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message..." className="flex-1 border p-2 rounded" />
        <button onClick={onSend} className="bg-blue-600 text-white px-3 rounded">Send</button>
        <input ref={fileRef} type="file" onChange={onFileChange} className="border rounded p-1" />
      </div>
    </div>
  );
}

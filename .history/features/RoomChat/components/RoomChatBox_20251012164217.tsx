// features/RoomSystem/components/RoomChatBox.tsx
import React, { useState } from "react";
import { useRoomChat } from "../hooks/useRoomChat";

export default function RoomChatBox({ roomId }: { roomId: string }) {
  const { messages, send, loadMore } = useRoomChat(roomId);
  const [text, setText] = useState("");

  const onSend = () => {
    if (!text.trim()) return;
    send({ senderId: "me", senderName: "Me", content: text, type: "text", timestamp: Date.now() });
    setText("");
  };

  return (
    <div className="p-2 border rounded h-80 flex flex-col">
      <button onClick={() => loadMore()} className="mb-2 text-sm">Load more</button>
      <div className="flex-1 overflow-auto space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="p-2 border rounded">
            <div className="text-xs text-gray-500">{m.senderName} • {new Date(m.timestamp).toLocaleTimeString()}</div>
            <div>{m.content}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message..." className="flex-1 border p-2" />
        <button onClick={onSend} className="bg-blue-600 text-white px-3 rounded">Send</button>
      </div>
    </div>
  );
}

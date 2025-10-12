// src/app/rooms/page.tsx
import React from "react";
import RoomLobby from "../../../features/RoomChat/components/RoomLobby";

export default function RoomsPage() {
  return (
    <main className="p-6">
      <RoomLobby />
    </main>
  );
}

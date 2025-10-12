// src/app/rooms/layout.tsx
import { SocketProvider } from "../../../features/RoomChat/hooks/SocketProvider";

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}

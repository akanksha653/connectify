import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  connectRoomSocket,
  disconnectRoomSocket,
  getRoomSocket,
} from "../services/roomSocketService";

export default function useRoomSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Establish connection
    const s = connectRoomSocket(); // Prefer connectRoomSocket() to return the socket
    setSocket(s);

    return () => {
      // Clean up connection on unmount
      disconnectRoomSocket();
      setSocket(null);
    };
  }, []);

  return socket;
}

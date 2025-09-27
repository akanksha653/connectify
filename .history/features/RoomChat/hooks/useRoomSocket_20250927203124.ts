import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  connectRoomSocket,
  disconnectRoomSocket,
} from "../services/roomSocketService";

export default function useRoomSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to the room socket
    const s = connectRoomSocket();
    setSocket(s);

    // Clean up on unmount
    return () => {
      if (s) {
        disconnectRoomSocket();
        setSocket(null);
      }
    };
  }, []);

  return socket;
}

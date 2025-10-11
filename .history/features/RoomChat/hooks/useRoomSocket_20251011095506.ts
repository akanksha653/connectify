import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  connectRoomSocket,
  disconnectRoomSocket,
} from "../services/roomSocketService";

/** React hook to manage /rooms socket connection */
export default function useRoomSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to /rooms namespace
    const s = connectRoomSocket();
    setSocket(s);

    // Cleanup on unmount
    return () => {
      if (s) {
        disconnectRoomSocket();
        setSocket(null);
      }
    };
  }, []);

  return socket;
}

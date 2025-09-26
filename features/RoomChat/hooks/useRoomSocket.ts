import { useEffect, useRef, useState } from "react";
import { connectRoomSocket, disconnectRoomSocket, getRoomSocket } from "../services/roomSocketService";

export default function useRoomSocket() {
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    connectRoomSocket();
    const s = getRoomSocket();
    setSocket(s);

    return () => {
      disconnectRoomSocket();
      setSocket(null);
    };
  }, []);

  return socket;
}

// features/anonymousChat/hooks/useChatHandlers.ts
import { useEffect, useCallback } from "react";
import { UserInfo } from "@/types/user";

interface HandlersProps {
  socket: any; // socket.io client
  playSound: (type: "match" | "leave") => void;
  setRoomId: (id: string | null) => void;
  setIsOfferer: (val: boolean | null) => void;
  setPartnerInfo: (val: UserInfo | null) => void;
  setLoading: (val: boolean) => void;
  setSessionStarted: (val: boolean) => void;
  setLastAction: (val: "skipped" | "left" | null) => void;
}

export function useChatHandlers({
  socket,
  playSound,
  setRoomId,
  setIsOfferer,
  setPartnerInfo,
  setLoading,
  setSessionStarted,
  setLastAction,
}: HandlersProps) {
  // ------------------------------
  // Handle match found
  // ------------------------------
  const handleMatched = useCallback(
    (data: any) => {
      console.log("✅ Matched:", data);

      const {
        roomId,
        isOfferer,
        partnerId,
        partnerName,
        partnerAge,
        partnerCountry,
      } = data;

      setRoomId(roomId);
      setIsOfferer(isOfferer);

      setPartnerInfo({
        uid: partnerId,
        name: partnerName || "Stranger",
        age: partnerAge || "",
        gender: "", // optional
        country: partnerCountry || "",
        email: "",
      });

      setLoading(false);
      setLastAction(null);
      playSound("match");
    },
    [playSound, setRoomId, setIsOfferer, setPartnerInfo, setLoading, setLastAction]
  );

  // ------------------------------
  // Handle partner left
  // ------------------------------
  const handlePartnerLeft = useCallback(() => {
    setRoomId(null);
    setIsOfferer(null);
    setSessionStarted(false);
    setLoading(false);
    setLastAction("left");
    setPartnerInfo(null);
    playSound("leave");
  }, [
    playSound,
    setRoomId,
    setIsOfferer,
    setSessionStarted,
    setLoading,
    setLastAction,
    setPartnerInfo,
  ]);

  // ------------------------------
  // Socket event listeners
  // ------------------------------
  useEffect(() => {
    if (!socket) return;

    socket.on("matched", handleMatched);
    socket.on("partner-left", handlePartnerLeft);

    return () => {
      socket.off("matched", handleMatched);
      socket.off("partner-left", handlePartnerLeft);
    };
  }, [socket, handleMatched, handlePartnerLeft]);

  // ------------------------------
  // Connection / disconnection
  // ------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      setLoading(false);
      setSessionStarted(false);
      setRoomId(null);
      setIsOfferer(null);
      setPartnerInfo(null);
      setLastAction(null);
    };

    const handleConnect = () => {
      console.log("✅ Connected to socket:", socket.id);
    };

    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
    };
  }, [socket, setLoading, setSessionStarted, setRoomId, setIsOfferer, setPartnerInfo, setLastAction]);

  // ------------------------------
  // Clean up: leave room on unmount
  // ------------------------------
  useEffect(() => {
    return () => {
      if (socket) {
        socket.emit("leave-room");
      }
    };
  }, [socket]);
}

// features/anonymousChat/hooks/useChatHandlers.ts
import { useEffect, useCallback } from "react";
import { UserInfo } from "@/types/user";

interface HandlersProps {
  socket: any;
  playSound: (type: "match" | "leave") => void;
  setRoomId: (id: string | null) => void;
  setIsOfferer: (val: boolean | null) => void;
  setPartnerInfo: (val: UserInfo | null) => void;
  setLoading: (val: boolean) => void;
  setSessionStarted: (val: boolean) => void;
  setLastAction: (val: "skipped" | "left" | null) => void;
  cleanup?: () => void; // optional: pass from useWebRTC for skip/stop
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
  cleanup,
}: HandlersProps) {
  // ------------------------------
  // Handle successful match
  // ------------------------------
  const handleMatched = useCallback(
    (data: any) => {
      console.log("✅ Matched:", data);

      const { roomId, isOfferer, partnerId, partnerName, partnerAge, partnerCountry } = data;

      setRoomId(roomId);
      setIsOfferer(isOfferer);

      setPartnerInfo({
        uid: partnerId,
        name: partnerName || "Stranger",
        age: partnerAge || "",
        gender: "",
        country: partnerCountry || "",
        email: "",
      });

      setLoading(false);
      setSessionStarted(true);
      setLastAction(null);
      playSound("match");
    },
    [playSound, setRoomId, setIsOfferer, setPartnerInfo, setLoading, setSessionStarted, setLastAction]
  );

  // ------------------------------
  // Handle partner leaving
  // ------------------------------
  const handlePartnerLeft = useCallback(() => {
    console.log("⚠️ Partner left the chat.");

    if (cleanup) cleanup(); // cleanup streams

    setRoomId(null);
    setIsOfferer(null);
    setSessionStarted(false);
    setLoading(false);
    setLastAction("left");
    setPartnerInfo(null);
    playSound("leave");
  }, [cleanup, playSound, setRoomId, setIsOfferer, setSessionStarted, setLoading, setLastAction, setPartnerInfo]);

  // ------------------------------
  // Skip partner (hard skip)
  // ------------------------------
  const handleSkip = useCallback(() => {
    console.log("⏭ Skipping partner...");

    if (cleanup) cleanup(); // cleanup streams

    setRoomId(null);
    setIsOfferer(null);
    setSessionStarted(false);
    setLoading(true); // show loading while finding next partner
    setLastAction("skipped");
    setPartnerInfo(null);
    socket?.emit("leave-room"); // notify server
  }, [cleanup, setRoomId, setIsOfferer, setSessionStarted, setLoading, setLastAction, setPartnerInfo, socket]);

  // ------------------------------
  // Socket event bindings
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
  // Socket connection lifecycle
  // ------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => console.log("✅ Connected to socket:", socket.id);
    const handleDisconnect = () => {
      console.warn("⚠️ Socket disconnected.");
      if (cleanup) cleanup();

      setLoading(false);
      setSessionStarted(false);
      setRoomId(null);
      setIsOfferer(null);
      setPartnerInfo(null);
      setLastAction(null);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, cleanup, setLoading, setSessionStarted, setRoomId, setIsOfferer, setPartnerInfo, setLastAction]);

  // ------------------------------
  // Handle page unload (refresh/close)
  // ------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleBeforeUnload = () => {
      if (cleanup) cleanup();
      socket.emit("leave-room");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socket, cleanup]);

  // ------------------------------
  // Cleanup on unmount
  // ------------------------------
  useEffect(() => {
    return () => {
      if (cleanup) cleanup();
      socket?.emit("leave-room");
    };
  }, [socket, cleanup]);

  return { handleSkip }; // expose skip for ControlBar
}

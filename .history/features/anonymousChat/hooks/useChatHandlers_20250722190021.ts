import { useEffect, useCallback } from "react";

interface HandlersProps {
  socket: any;
  playSound: (type: "match" | "leave") => void;
  setRoomId: (id: string | null) => void;
  setIsOfferer: (val: boolean | null) => void;
  setPartnerInfo: (val: any) => void;
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
  const handleMatched = useCallback(
    ({ roomId, isOfferer, partnerInfo }: any) => {
      console.log("✅ handleMatched received:", { roomId, isOfferer, partnerInfo });
      setRoomId(roomId);
      setIsOfferer(isOfferer);
      setPartnerInfo(partnerInfo);
      setLoading(false);
      setLastAction(null);
      playSound("match");
    },
    [playSound]
  );

  const handlePartnerLeft = useCallback(() => {
    setRoomId(null);
    setIsOfferer(null);
    setSessionStarted(false);
    setLoading(false);
    setLastAction("left");
    playSound("leave");
  }, [playSound]);

  useEffect(() => {
    if (!socket) return;
    socket.on("matched", handleMatched);
    socket.on("partner-left", handlePartnerLeft);
    return () => {
      socket.off("matched", handleMatched);
      socket.off("partner-left", handlePartnerLeft);
    };
  }, [socket, handleMatched, handlePartnerLeft]);

  useEffect(() => {
    if (!socket) return;
    const handleDisconnect = () => {
      setLoading(false);
      setSessionStarted(false);
    };
    const handleConnect = () => {
      console.log("Connected to socket:", socket.id);
    };
    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);
    return () => {
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
    };
  }, [socket]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.emit("leave-room");
      }
    };
  }, [socket]);
}

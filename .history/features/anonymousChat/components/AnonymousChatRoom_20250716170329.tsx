"use client";

import React, { useEffect, useState } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";
import {
  Users,
  RefreshCcw,
  CircleStop,
} from "lucide-react";

import { useSoundPlayer } from "../hooks/useSoundPlayer";
import { useChatHandlers } from "../hooks/useChatHandlers";
import IdleMessage from "./IdleMessage";
import ControlBar from "./ControlBar";

export default function AnonymousChatRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isOfferer, setIsOfferer] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [lastAction, setLastAction] = useState<"skipped" | "left" | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  const [userInfo, setUserInfo] = useState<any>({});
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [genderFilter, setGenderFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const socket = useSocket();
  const { localStream, remoteStream } = useWebRTC(roomId, isOfferer, sessionStarted);

  const { matchSoundRef, leaveSoundRef, playSound } = useSoundPlayer(soundOn);

  useChatHandlers({
    socket,
    playSound,
    setRoomId,
    setIsOfferer,
    setPartnerInfo,
    setLoading,
    setSessionStarted,
    setLastAction,
  });

  useEffect(() => {
    const stored = localStorage.getItem("user-info");
    if (stored) {
      setUserInfo(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (socket && roomId) {
        socket.emit("leave-room", roomId);
      }
    };
  }, [socket, roomId]);

  const handleStart = () => {
    if (!sessionStarted) {
      setLoading(true);
      setSessionStarted(true);
      socket?.emit("start-looking", {
        name: userInfo.name,
        age: userInfo.age,
        gender: userInfo.gender,
        country: userInfo.country,
        filterGender: genderFilter,
        filterCountry: countryFilter,
      });
    }
  };

  const handleStop = () => {
    if (roomId) {
      socket?.emit("leave-room", roomId);
    }
    setRoomId(null);
    setIsOfferer(null);
    setSessionStarted(false);
    setLoading(false);
  };

  const handleSkip = () => {
    handleStop();
    handleStart();
    setLastAction("skipped");
  };

  const renderControlButton = () => {
    const baseClasses =
      "flex items-center gap-2 px-4 py-2 rounded-lg shadow font-medium transition whitespace-nowrap";
    if (!sessionStarted) {
      return (
        <button
          onClick={handleStart}
          className={`${baseClasses} bg-green-600 hover:bg-green-700 text-white`}
        >
          <Users className="w-5 h-5" />
          Start
        </button>
      );
    } else if (loading) {
      return (
        <button
          onClick={handleStop}
          className={`${baseClasses} bg-red-600 hover:bg-red-700 text-white`}
        >
          <CircleStop className="w-5 h-5" />
          Stop
        </button>
      );
    } else {
      return (
        <button
          onClick={handleSkip}
          className={`${baseClasses} bg-yellow-500 hover:bg-yellow-600 text-white`}
        >
          <RefreshCcw className="w-5 h-5" />
          Skip
        </button>
      );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      {/* Sounds */}
      <audio ref={matchSoundRef} src="/sounds/match.mp3" preload="auto" />
      <audio ref={leaveSoundRef} src="/sounds/leave.mp3" preload="auto" />

      {/* Video Section */}
      <div
        className="relative flex items-center justify-center p-3 sm:p-4 bg-black overflow-hidden w-full md:flex-1"
        style={{ height: "55vh" }}
      >
        {!sessionStarted ? (
          <div className="text-white text-lg sm:text-xl font-semibold text-center px-4">
            Click Start to begin searching
          </div>
        ) : loading ? (
          <FindingPartner />
        ) : (
          <>
            <RemoteVideo stream={remoteStream} />
            <div className="absolute top-4 right-4 w-32 h-32 sm:w-40 sm:h-40 rounded overflow-hidden border-2 border-white shadow-lg z-20">
              {localStream ? (
                <LocalVideo stream={localStream} />
              ) : (
                <div className="text-white text-sm p-2">Loading camera...</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chat + Controls */}
      <div className="w-full md:w-[420px] flex flex-col flex-1 min-h-0 border-t md:border-t-0 md:border-l border-neutral-300 dark:border-neutral-700">
        <div className="flex-grow overflow-y-auto min-h-0">
          {roomId ? (
            <ChatBox
              socket={socket}
              roomId={roomId}
              soundOn={soundOn}
              partnerName={partnerInfo?.name}
              partnerAge={partnerInfo?.age}
            />
          ) : (
            <IdleMessage lastAction={lastAction} />
          )}
        </div>

        {/* Bottom Controls */}
        <ControlBar
          userInfo={userInfo}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
          countryFilter={countryFilter}
          setCountryFilter={setCountryFilter}
          renderControlButton={renderControlButton}
        />
      </div>
    </div>
  );
}

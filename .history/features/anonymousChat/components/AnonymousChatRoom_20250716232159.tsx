"use client";

import React, { useEffect, useState } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";
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

  return (
    <div className="h-screen mt-[56px]">  {/* Covers full screen below navbar */}
      <audio ref={matchSoundRef} src="/sounds/match.mp3" preload="auto" />
      <audio ref={leaveSoundRef} src="/sounds/leave.mp3" preload="auto" />

      {/* === Main Container: Wraps both video container and chat+control container === */}
      <div className="flex flex-col md:flex-row w-full h-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        
        {/* 🎥 Video Container */}
        <div className="flex-1 flex items-center justify-center p-3 sm:p-4 bg-black relative overflow-hidden h-[66vh] md:h-full">
          {!sessionStarted ? (
            <div className="text-white text-lg sm:text-xl font-semibold text-center px-4">
              Click Start to begin searching
            </div>
          ) : loading ? (
            <FindingPartner />
          ) : (
            <>
              <RemoteVideo stream={remoteStream} />
              <div className="absolute top-4 right-4 w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded overflow-hidden border-2 border-white shadow-lg z-20">
                {localStream ? (
                  <LocalVideo stream={localStream} />
                ) : (
                  <div className="text-white text-sm p-2">Loading camera...</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 💬 Chat + Controls Container */}
        <div className="w-full md:w-[420px] flex flex-col border-t md:border-t-0 md:border-l border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 h-[34vh] md:h-full">
          
          {/* Chat Box */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
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

          {/* Control Bar */}
          <ControlBar
            userInfo={userInfo}
            soundOn={soundOn}
            setSoundOn={setSoundOn}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            countryFilter={countryFilter}
            setCountryFilter={setCountryFilter}
            sessionStarted={sessionStarted}
            loading={loading}
            handleStart={handleStart}
            handleStop={handleStop}
            handleSkip={handleSkip}
          />
        </div>
      </div>
    </div>
  );
}

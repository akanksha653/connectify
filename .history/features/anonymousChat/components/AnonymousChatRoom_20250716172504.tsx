"use client";

import React, { useEffect, useState } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";
import { Users, RefreshCcw, CircleStop } from "lucide-react";
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
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)] bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      {/* Sounds */}
      <audio ref={matchSoundRef} src="/sounds/match.mp3" preload="auto" />
      <audio ref={leaveSoundRef} src="/sounds/leave.mp3" preload="auto" />

      {/* Video Section */}
      <div className="flex-1 relative flex items-center justify-center p-3 sm:p-4 bg-black min-h-0 overflow-hidden">
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
      <div className="w-full md:w-[420px] flex flex-col min-h-0 border-t md:border-t-0 md:border-l border-neutral-300 dark:border-neutral-700">
        <div
          className={`
            flex-grow overflow-y-auto min-h-0
            max-h-[45vh] sm:max-h-full
          `}
        >
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
        <div className="p-3 border-t border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-2">
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 w-full sm:w-auto">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm focus:outline-none"
              >
                <option value="">Any Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              <input
                type="text"
                placeholder="Country"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm focus:outline-none"
              />

              <button
                onClick={() => setSoundOn(!soundOn)}
                className="text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm hover:bg-neutral-200 dark:hover:bg-neutral-600"
              >
                Sound: {soundOn ? "On" : "Off"}
              </button>
            </div>

            {/* Control Button */}
            <div className="w-full sm:w-auto flex justify-center sm:justify-end">
              {renderControlButton()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

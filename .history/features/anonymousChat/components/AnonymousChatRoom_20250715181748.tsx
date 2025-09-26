"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../components/video/LocalVideo";
import RemoteVideo from "../../../components/video/RemoteVideo";
import ChatBox from "../../../components/chat/ChatBox";
import Image from "next/image";
import FindingPartner from "./FindingPartner";
import {
  Users,
  RefreshCcw,
  CircleStop,
  Volume2,
  VolumeX,
  Smile,
  UserX,
} from "lucide-react";

export default function AnonymousChatRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isOfferer, setIsOfferer] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [lastAction, setLastAction] = useState<"skipped" | "left" | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  const [userInfo, setUserInfo] = useState<any>({});
  const avatarUrl = userInfo?.avatar || "/default-avatar.png";
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [genderFilter, setGenderFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const socket = useSocket();
  const { localStream, remoteStream } = useWebRTC(roomId, isOfferer, sessionStarted);

  const matchSoundRef = useRef<HTMLAudioElement>(null);
  const leaveSoundRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user-info");
    if (stored) {
      setUserInfo(JSON.parse(stored));
    }
  }, []);

  const playSound = (type: "match" | "leave") => {
    if (!soundOn) return;
    const audioRef = type === "match" ? matchSoundRef : leaveSoundRef;
    const play = async () => {
      try {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = 0.8;
        await audio.play();
      } catch (err) {
        const ctx = new AudioContext();
        await ctx.resume();
      }
    };
    play();
  };

  const handleMatched = useCallback(
    ({ roomId, isOfferer, partnerInfo }: { roomId: string; partnerId: string; isOfferer: boolean; partnerInfo: any }) => {
      setRoomId(roomId);
      setIsOfferer(isOfferer);
      setPartnerInfo(partnerInfo);
      setLoading(false);
      setLastAction(null);
      playSound("match");
    },
    [soundOn]
  );

  const handlePartnerLeft = useCallback(() => {
    setRoomId(null);
    setIsOfferer(null);
    setSessionStarted(false);
    setLoading(false);
    setLastAction("left");
    playSound("leave");
  }, [soundOn]);

  useEffect(() => {
    if (!socket) return;
    socket.off("matched", handleMatched);
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

  const renderIdleMessage = () => {
    if (roomId) return null;
    const baseStyle =
      "flex flex-col items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-400 p-4 text-sm gap-2";

    if (lastAction === "skipped") {
      return (
        <div className={baseStyle}>
          <Smile className="w-8 h-8 text-yellow-400" />
          <p>You skipped the chat.</p>
          <p>Click <b>Start</b> to connect with someone new!</p>
        </div>
      );
    } else if (lastAction === "left") {
      return (
        <div className={baseStyle}>
          <UserX className="w-8 h-8 text-red-400" />
          <p>Your partner left the chat.</p>
          <p>Click <b>Start</b> to begin again.</p>
        </div>
      );
    } else {
      return (
        <div className={baseStyle}>
          <Users className="w-8 h-8 text-neutral-400" />
          <p>Click <b>Start</b> to begin searching for a partner.</p>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
      {/* Sounds */}
      <audio ref={matchSoundRef} src="/sounds/match.mp3" preload="auto" />
      <audio ref={leaveSoundRef} src="/sounds/leave.mp3" preload="auto" />

      {/* Video Section */}
      <div className="flex-1 relative bg-black flex items-center justify-center p-3 sm:p-4 overflow-hidden">
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
      <div className="w-full md:w-[420px] flex flex-col border-t md:border-t-0 md:border-l border-neutral-300 dark:border-neutral-700">
        <div className="flex-grow overflow-y-auto">
          {roomId ? (
            <ChatBox
              socket={socket}
              roomId={roomId}
              soundOn={soundOn}
              partnerName={partnerInfo?.name}
              partnerAge={partnerInfo?.age}
            />
          ) : (
            renderIdleMessage()
          )}
        </div>

        {/* Bottom Controls */}
        <div className="p-3 border-t border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center justify-between">
           
              <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {userInfo.name} <span className="text-xs opacity-70">({userInfo.age})</span>
              </div>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundOn((prev) => !prev)}
              className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
              title={soundOn ? "Mute Sounds" : "Unmute Sounds"}
            >
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm focus:outline-none"
              aria-label="Gender Filter"
            >
              <option value="">Gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>

            {/* Country Input */}
            <input
              type="text"
              placeholder="Country"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-[70%] text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-sm focus:outline-none"
            />

            {/* Control Button */}
            <div className="flex-1 sm:flex-initial">
              {renderControlButton()}
            </div>
          </div>
        </div>
      </div>
  );
}

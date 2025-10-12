"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, get, set } from "firebase/database";
import { database } from "@/lib/firebaseConfig";
import useWebRTC from "../hooks/useWebRTC";
import useSocket from "../hooks/useSocket";
import LocalVideo from "../../../../../components/video/LocalVideo";
import RemoteVideo from "../../../../../components/video/RemoteVideo";
import ChatBox from "../../../../../components/chat/ChatBox";
import FindingPartner from "./FindingPartner";
import IdleMessage from "./IdleMessage";
import ControlBar from "./ControlBar";
import { useSoundPlayer } from "../hooks/useSoundPlayer";
import { UserInfo } from "@/types/user";
import { useAuth } from "../../../auth/authContext";

export default function AnonymousChatRoom() {
  const router = useRouter();
  const { userId: authUserId, loading: authLoading } = useAuth();

  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<UserInfo | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isOfferer, setIsOfferer] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [lastAction, setLastAction] = useState<"skipped" | "left" | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [micMuted, setMicMuted] = useState(false);
  const [genderFilter, setGenderFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const socket = useSocket();
  const { localStream, remoteStream } = useWebRTC({
    roomId,
    isOfferer,
    isStarted: sessionStarted,
    socket,
  });

  const { matchSoundRef, leaveSoundRef, playSound } = useSoundPlayer(soundOn);

  // -------------------------
  // Stable userId
  // -------------------------
  useEffect(() => {
    const id =
      authUserId || localStorage.getItem("userId") || crypto.randomUUID();
    localStorage.setItem("userId", id);
    setUserId(id);
  }, [authUserId]);

  // -------------------------
  // Redirect unauthenticated
  // -------------------------
  useEffect(() => {
    if (!authLoading && !authUserId) router.replace("/auth");
  }, [authLoading, authUserId, router]);

  // -------------------------
  // Fetch current user info
  // -------------------------
  useEffect(() => {
    if (!userId) return;

    const fetchUserInfo = async () => {
      try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
          router.replace("/auth");
          return;
        }

        const data = snapshot.val();
        setUserInfo({
          uid: userId,
          name: data.name || "Anonymous",
          age: data.age || "",
          gender: data.gender || "",
          country: data.country || "",
          email: data.email || "",
        });
      } catch (err) {
        console.error("Error fetching user info:", err);
        router.replace("/auth");
      }
    };

    fetchUserInfo();
  }, [userId, router]);

  // -------------------------
  // Mute/unmute microphone
  // -------------------------
  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !micMuted;
    });
  }, [micMuted, localStream]);

  // -------------------------
  // Chat control handlers
  // -------------------------
  const handleStart = () => {
    if (sessionStarted || !userInfo) return;
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
  };

  const handleStop = () => {
    if (roomId) socket?.emit("leave-room", roomId);
    setRoomId(null);
    setIsOfferer(null);
    setSessionStarted(false);
    setLoading(false);
    setPartnerInfo(null);
  };

  const handleSkip = () => {
    handleStop();
    handleStart();
    setLastAction("skipped");
  };

  // -------------------------
  // Listen for match & setup room
  // -------------------------
  useEffect(() => {
    if (!socket) return;

    const handleMatched = async (data: any) => {
      console.log("✅ Matched event:", data);
      const {
        roomId,
        partnerId,
        isOfferer,
        partnerName,
        partnerAge,
        partnerCountry,
      } = data;

      setRoomId(roomId);
      setIsOfferer(isOfferer);
      socket.emit("join-room", roomId);

      const info = {
        uid: partnerId,
        name: partnerName || "Stranger",
        age: partnerAge || "",
        gender: "",
        country: partnerCountry || "",
        email: "",
      };
      setPartnerInfo(info);

      const roomRef = ref(database, `rooms/${roomId}`);
      await set(roomRef, {
        createdAt: new Date().toISOString(),
        messages: {},
      });

      socket.emit("chat-connected", { roomId });

      setLoading(false);
      playSound("match");
    };

    const handlePartnerLeft = () => {
      setRoomId(null);
      setIsOfferer(null);
      setPartnerInfo(null);
      setSessionStarted(false);
      setLoading(false);
      setLastAction("left");
      playSound("leave");
    };

    socket.on("matched", handleMatched);
    socket.on("partner-left", handlePartnerLeft);

    return () => {
      socket.off("matched", handleMatched);
      socket.off("partner-left", handlePartnerLeft);
    };
  }, [socket, playSound]);

  // -------------------------
  // Render
  // -------------------------
  if (authLoading || !userInfo || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
        <p className="text-lg text-neutral-700 dark:text-neutral-300">
          Loading user info...
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)]">
      {/* 🔊 Sounds */}
      <audio ref={matchSoundRef} src="/sounds/match.mp3" preload="auto" />
      <audio ref={leaveSoundRef} src="/sounds/leave.mp3" preload="auto" />

      <div className="flex flex-col md:flex-row w-full h-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {/* 🎥 Video Section */}
        <div className="flex-1 flex items-center justify-center p-3 bg-black relative overflow-hidden h-[66vh] md:h-full">
          {!sessionStarted ? (
            <div className="text-white text-lg sm:text-xl font-semibold text-center">
              Click Start to begin searching
            </div>
          ) : loading ? (
            <FindingPartner />
          ) : (
            <>
              <RemoteVideo stream={remoteStream} />
              <div className="absolute top-4 right-4 w-32 h-32 rounded overflow-hidden border-2 border-white shadow-lg">
                {localStream ? (
                  <LocalVideo stream={localStream} />
                ) : (
                  <div className="text-white text-sm p-2">
                    Loading camera...
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 💬 Chat Section */}
        <div className="w-full md:w-[420px] flex flex-col border-t md:border-l border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 h-[34vh] md:h-full">
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {roomId && partnerInfo ? (
              <ChatBox
                socket={socket}
                roomId={roomId}
                userId={userId}
                soundOn={soundOn}
                partnerName={partnerInfo.name}
                partnerAge={partnerInfo.age}
                partnerCountry={partnerInfo.country}
              />
            ) : sessionStarted && loading ? (
              <FindingPartner />
            ) : sessionStarted ? (
              <p className="text-center text-gray-400 mt-4">Connecting...</p>
            ) : (
              <IdleMessage lastAction={lastAction} />
            )}
          </div>

          {/* 🎮 Controls */}
          <ControlBar
            userInfo={userInfo}
            soundOn={soundOn}
            setSoundOn={setSoundOn}
            micMuted={micMuted}
            setMicMuted={setMicMuted}
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

"use client";

import React, { useState } from "react";
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff } from "react-icons/fi";

interface Props {
  localStream: MediaStream | null;
  onLeave: () => void;
}

export default function RoomChatControl({ localStream, onLeave }: Props) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    setIsCameraOff((prev) => !prev);
  };

  const buttonClasses =
    "p-3 rounded-full text-white text-2xl flex items-center justify-center transition-transform transform hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-white";

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 bg-black/40 p-3 rounded-xl shadow-lg z-50 backdrop-blur-sm">
      {/* Mute/Unmute */}
      <button
        onClick={toggleMute}
        className={`${buttonClasses} ${isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-800 hover:bg-gray-700"}`}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <FiMicOff /> : <FiMic />}
      </button>

      {/* Camera toggle */}
      <button
        onClick={toggleCamera}
        className={`${buttonClasses} ${isCameraOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-800 hover:bg-gray-700"}`}
        title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
      >
        {isCameraOff ? <FiVideoOff /> : <FiVideo />}
      </button>

      {/* Leave room */}
      <button
        onClick={onLeave}
        className={`${buttonClasses} bg-red-600 hover:bg-red-700`}
        title="Leave Room"
      >
        <FiPhoneOff />
      </button>
    </div>
  );
}

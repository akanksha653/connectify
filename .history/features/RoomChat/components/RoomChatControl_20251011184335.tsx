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

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 bg-black/40 p-3 rounded-lg shadow-lg z-50">
      {/* Mute/Unmute */}
      <button
        onClick={toggleMute}
        className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white text-xl flex items-center justify-center"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <FiMicOff /> : <FiMic />}
      </button>

      {/* Camera toggle */}
      <button
        onClick={toggleCamera}
        className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white text-xl flex items-center justify-center"
        title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
      >
        {isCameraOff ? <FiVideoOff /> : <FiVideo />}
      </button>

      {/* Leave room */}
      <button
        onClick={onLeave}
        className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white text-xl flex items-center justify-center"
        title="Leave Room"
      >
        <FiPhoneOff />
      </button>
    </div>
  );
}

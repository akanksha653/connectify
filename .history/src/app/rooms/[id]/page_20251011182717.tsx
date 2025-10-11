"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import LocalVideo from "../../../../features/RoomChat/components/LocalVideo";
import RemoteVideo from "../../../../features/RoomChat/components/RemoteVideo";
import ChatBox from "../../../../features/RoomChat/components/RoomChatBox";
import {
  connectRoomSocket,
  disconnectRoomSocket,
} from "../../../../features/RoomChat/services/roomSocketService";

interface UserInfo {
  name?: string;
  age?: string;
  gender?: string;
  country?: string;
}

interface RoomUser {
  socketId: string;
  userInfo: UserInfo;
}

interface RoomInfo {
  id: string;
  name: string;
  topic: string;
  description?: string;
  users: RoomUser[];
}

export default function RoomPage() {
  const { id } = useParams() as { id: string };
  const socketRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // map peerId -> { pc, name }
  const peerConnections = useRef<Record<string, { pc: RTCPeerConnection; name?: string }>>({});
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});

  // Get user-info from localStorage (your code stores it there)
  const userInfo: UserInfo = JSON.parse(localStorage.getItem("user-info") || "{}");

  // Start camera & mic
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          // safety: if unmounted while awaiting
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        // force a render so local video appears
        setPeers((p) => ({ ...p }));
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Helper: create RTCPeerConnection for a peerId
  const createPeerConnection = (peerId: string, name?: string) => {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId].pc;

    const socket = socketRef.current;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    // Attach local tracks (if available)
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
      } catch (e) {
        console.warn("Failed to add local tracks:", e);
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        // send candidate to the target peer
        socket.emit("room-ice", { roomId: id, candidate: e.candidate, to: peerId });
      }
    };

    pc.ontrack = (e) => {
      // set remote stream for rendering
      if (!e.streams || !e.streams[0]) return;
      setPeers((prev) => ({ ...prev, [peerId]: e.streams[0] }));
    };

    pc.onconnectionstatechange = () => {
      // debug
      console.log(`Peer ${peerId} connectionState:`, pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        // cleanup
        removePeer(peerId);
      }
    };

    peerConnections.current[peerId] = { pc, name };
    return pc;
  };

  // Remove peer and its stream
  const removePeer = (peerId: string) => {
    const data = peerConnections.current[peerId];
    if (data?.pc) {
      try {
        data.pc.close();
      } catch (e) {
        console.warn("Error closing pc:", e);
      }
    }
    delete peerConnections.current[peerId];
    setPeers((prev) => {
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
  };

  // Create an offer to a given peerId
  const createOfferToPeer = async (peerId: string, name?: string) => {
    if (!localStreamRef.current) {
      console.warn("No local stream available for offer");
      return;
    }
    // don't recreate if exists
    if (peerConnections.current[peerId]) return;

    const pc = createPeerConnection(peerId, name);
    try {
      // ensure local tracks attached
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          pc.addTrack(t, localStreamRef.current!);
        } catch (err) {
          // adding same track twice can throw — ignore
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("room-offer", { roomId: id, offer, to: peerId });
      console.log("Sent offer to", peerId);
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  };

  // Clean up all peer connections
  const cleanupAllPeers = () => {
    Object.keys(peerConnections.current).forEach((pid) => {
      try {
        peerConnections.current[pid].pc.close();
      } catch (e) {
        // ignore
      }
      delete peerConnections.current[pid];
    });
    setPeers({});
  };

  // Connect to /rooms namespace, join room, and wire signaling listeners
  useEffect(() => {
    // wait for local stream to be ready
    if (!localStreamRef.current) return;

    const socket = connectRoomSocket();
    socketRef.current = socket;

    // Ask server for rooms list (so we can find room metadata/users)
    socket.emit("list-rooms");

    // When server sends the list of rooms, extract this room's info (if present)
    socket.on("rooms", (roomsArray: RoomInfo[]) => {
      try {
        const found = (roomsArray || []).find((r: any) => r.id === id);
        if (found) {
          // server's room object may or may not include users; normalize
          const users = (found.users || []).map((u: any) =>
            typeof u === "string" ? { socketId: u, userInfo: {} } : u
          );
          setRoom({ ...found, users });
        }
      } catch (e) {
        console.warn("Error parsing rooms list", e);
      }
    });

    // IMPORTANT: request user list for this room if your server supports it
    // If your server emits "room-users" with [{ socketId, userInfo }], we'll use it.
    socket.on("room-users", (users: RoomUser[]) => {
      // Replace room state and create offers to existing users
      setRoom((prev) => ({ ...(prev || {}), users: users || [] } as RoomInfo));

      // Create offers to each existing user (except ourselves)
      users.forEach((u) => {
        if (u.socketId && u.socketId !== socket.id) {
          // wait a moment to ensure we have local tracks
          setTimeout(() => createOfferToPeer(u.socketId, u.userInfo?.name), 50);
        }
      });
    });

    // When someone joins the room, server should emit 'user-joined'.
    // Preferred: server includes socketId in payload. If server only sends userInfo (no socketId),
    // you should update the server to emit full user object including socketId.
    socket.on("user-joined", (payload: any) => {
      // payload ideally: { socketId, userInfo } OR userInfo only
      console.log("user-joined payload:", payload);
      const hasSocketId = payload && payload.socketId;
      if (hasSocketId) {
        const u: RoomUser = payload;
        setRoom((prev) => {
          const copy = prev ? { ...prev } : { id, name: "", topic: "", users: [] } as RoomInfo;
          copy.users = copy.users ? [...copy.users.filter((x) => x.socketId !== u.socketId), u] : [u];
          return copy;
        });

        // create offer to the newcomer
        if (payload.socketId !== socket.id) {
          setTimeout(() => createOfferToPeer(payload.socketId, payload.userInfo?.name), 50);
        }
      } else {
        // No socketId present — fall back: ask server to send room-users list (server should do this)
        console.warn("user-joined did not include socketId. Please update server to emit socketId or emit 'room-users'.");
        socket.emit("list-rooms");
      }
    });

    // Handle offers from peers
    socket.on("room-offer", async ({ from, offer, name }: { from: string; offer: RTCSessionDescriptionInit; name?: string }) => {
      try {
        if (!localStreamRef.current) {
          console.warn("Got offer but localStream not ready");
          return;
        }
        console.log("Received offer from", from);
        const pc = createPeerConnection(from, name);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        // ensure our local tracks added
        localStreamRef.current.getTracks().forEach((t) => {
          try {
            pc.addTrack(t, localStreamRef.current!);
          } catch (e) {}
        });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("room-answer", { roomId: id, answer, to: from });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    });

    // Handle answers from peers
    socket.on("room-answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      try {
        const pc = peerConnections.current[from]?.pc;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("Set remote description (answer) from", from);
        } else {
          console.warn("Received answer but no pc for", from);
        }
      } catch (err) {
        console.error("Error applying answer:", err);
      }
    });

    // Handle ICE candidates from peers
    socket.on("room-ice", ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConnections.current[from]?.pc;
        if (pc && candidate) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
            console.warn("addIceCandidate error:", err);
          });
        } else {
          console.warn("No pc to add ICE for", from);
        }
      } catch (err) {
        console.error("Error handling ICE:", err);
      }
    });

    // When a user leaves, server should emit 'user-left' with { userId: socketId }
    socket.on("user-left", ({ userId }: { userId: string }) => {
      removePeer(userId);
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, users: prev.users.filter((u) => u.socketId !== userId) };
      });
    });

    // Finally, emit join - telling server we joined (server should respond with room-users or user-joined)
    socket.emit("join-room", { roomId: id, user: userInfo });

    // cleanup on unmount
    return () => {
      try {
        socket.emit("leave-room", { roomId: id, userId: socket.id });
      } catch (e) {}
      cleanupAllPeers();
      disconnectRoomSocket();
      socketRef.current = null;
    };
  }, [id, userInfo]);

  // If no local stream yet
  if (!localStreamRef.current) return <p>Loading camera...</p>;

  const totalUsers = (room?.users?.length || Object.keys(peers).length + 1) || 1;
  const getGridCols = () => {
    if (totalUsers === 1) return "grid-cols-1";
    if (totalUsers === 2) return "grid-cols-2";
    if (totalUsers <= 4) return "grid-cols-2 md:grid-cols-2";
    if (totalUsers <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 min-h-screen">
      <div className={`flex-1 grid ${getGridCols()} gap-4`}>
        <LocalVideo stream={localStreamRef.current} label={userInfo?.name || "You"} />
        {Object.entries(peers).map(([peerId, stream]) => {
          const name = peerConnections.current[peerId]?.name || "Stranger";
          if (!stream) return null;
          return <RemoteVideo key={peerId} stream={stream} label={name} />;
        })}
      </div>

      <div className="md:w-80 flex-shrink-0">
        {socketRef.current && (
          <ChatBox
            socket={socketRef.current}
            roomId={id}
            userName={userInfo?.name || "You"}
          />
        )}
      </div>

      {room && (
        <div className="md:w-64 p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg shadow flex-shrink-0">
          <h2 className="text-lg font-bold">{room.name || "Room"}</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">{room.topic}</p>
          {room.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{room.description}</p>
          )}
          <p className="mt-2 text-sm font-medium">Users: {room.users?.length ?? Object.keys(peers).length + 1}</p>
          <div className="mt-3 text-xs text-neutral-600">
            <div>Tip: Mute/unmute and other controls are available in the top-right of the video tiles.</div>
          </div>
        </div>
      )}
    </div>
  );
}

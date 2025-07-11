// pages/api/socket.ts

import { Server as IOServer } from "socket.io";
import { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  // Ensure Socket.io is attached only once
  if (!res.socket.server.io) {
    console.log("🔌 Initializing Socket.io server...");

    const io = new IOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*", // ⚠️ Replace * with your frontend URL in production for security
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("✅ User connected:", socket.id);

      /**
       * Handle joining rooms
       */
      socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log(`📥 User ${socket.id} joined room ${roomId}`);
        socket.to(roomId).emit("user-joined", socket.id);
      });

      /**
       * Handle sending messages
       */
      socket.on("send-message", ({ roomId, message }) => {
        console.log(`💬 Message from ${socket.id} to room ${roomId}:`, message);
        socket.to(roomId).emit("receive-message", { message, sender: socket.id });
      });

      /**
       * Handle disconnection
       */
      socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
      });
    });

    // Attach to res.socket.server for re-use
    res.socket.server.io = io;
  } else {
    console.log("⚡ Socket.io server already running.");
  }

  res.end();
}

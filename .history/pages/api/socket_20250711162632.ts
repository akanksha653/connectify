// pages/api/socket.ts
import { Server } from "socket.io";
import { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  const socketServer = (res.socket as { server: any }).server;
  if (!socketServer.io) {
    console.log("🔌 Initializing Socket.io...");

    const io = new Server(socketServer, {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      console.log("✅ User connected:", socket.id);

      socket.on("join-room", (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-joined", socket.id);
      });

      socket.on("send-message", ({ roomId, message }) => {
        socket.to(roomId).emit("receive-message", { message, sender: socket.id });
      });

      socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}

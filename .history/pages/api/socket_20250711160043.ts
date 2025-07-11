// pages/api/socket.ts
import { Server } from "socket.io";
import { NextApiRequest } from "next";
import { NextApiResponseServerIO } from "../../types/next";

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log("🔌 Initializing Socket.io...");

    const io = new Server(res.socket.server, {
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

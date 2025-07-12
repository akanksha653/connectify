import { Server as IOServer } from "socket.io";
import { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log("🔌 Initializing Socket.io server...");

    const io = new IOServer(res.socket.server as any, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "https://my-omegle-clone.vercel.app", // ✅ set to your frontend URL
        methods: ["GET", "POST"],
      },
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
  } else {
    console.log("⚡ Socket.io server already running.");
  }

  return res.status(200).json({ message: "Socket.io server ready" });
}

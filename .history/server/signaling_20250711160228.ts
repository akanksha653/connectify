// server/signaling.ts

import { Server } from "socket.io";

export default function setupSignalingServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Join anonymous room
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", socket.id);
      console.log(`${socket.id} joined room ${roomId}`);
    });

    // Relay ICE candidates
    socket.on("ice-candidate", ({ candidate, to }) => {
      io.to(to).emit("ice-candidate", { candidate, from: socket.id });
    });

    // Relay offers
    socket.on("offer", ({ offer, to }) => {
      io.to(to).emit("offer", { offer, from: socket.id });
    });

    // Relay answers
    socket.on("answer", ({ answer, to }) => {
      io.to(to).emit("answer", { answer, from: socket.id });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      socket.broadcast.emit("user-disconnected", socket.id);
    });
  });

  return io;
}

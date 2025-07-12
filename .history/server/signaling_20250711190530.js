// server/signaling.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://my-omegle-clone.vercel.app", // ⚠️ Replace with your frontend URL in production for security
    methods: ["GET", "POST"],
  },
});

/**
 * Test route to confirm server is reachable
 */
app.get("/", (req, res) => {
  res.send("🚀 Signaling server is running and reachable!");
});

/**
 * Socket.io signaling logic
 */
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // User joins a room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`📥 User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  // Handle offer
  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
  });

  // Handle answer
  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
  });

  // Handle ICE candidates
  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

/**
 * Start server on Railway provided port or default to 3001
 */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server is running on port ${PORT}`);
});

// server/signaling.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://my-omegle-clone.vercel.app", // ✅ Replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("🚀 Signaling server is running and reachable!");
});

let waitingUser = null; // Queue for matchmaking

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Matchmaking logic
  if (waitingUser) {
    const roomId = uuidv4();

    // Join both users into the same room
    socket.join(roomId);
    waitingUser.join(roomId);

    console.log(`🔗 Matched ${waitingUser.id} & ${socket.id} in room ${roomId}`);

    // Notify both users of match
    waitingUser.emit("matched", { roomId, partnerId: socket.id });
    socket.emit("matched", { roomId, partnerId: waitingUser.id });

    // Clear waiting user
    waitingUser = null;
  } else {
    console.log(`⏳ No match yet. User ${socket.id} is waiting.`);
    waitingUser = socket;
  }

  // Listen for WebRTC and chat events
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`📥 User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
  });

  socket.on("send-message", ({ roomId, message }) => {
    console.log(`💬 Message from ${socket.id} to room ${roomId}: ${message}`);
    socket.to(roomId).emit("receive-message", { message, sender: "partner" });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    // Remove from waiting if they disconnect
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});

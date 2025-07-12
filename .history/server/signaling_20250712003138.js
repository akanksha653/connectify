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

// ✅ Health check endpoint
app.get("/", (req, res) => {
  res.send("🚀 Signaling server is running and reachable!");
});

// 🔗 Matchmaking queue
let waitingUser = null;

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  /**
   * 🔗 Matchmaking logic
   */
  if (waitingUser && waitingUser.connected) {
    const roomId = uuidv4();

    // Server assigns room ID and joins both users
    socket.join(roomId);
    waitingUser.join(roomId);

    console.log(`🔗 Matched ${waitingUser.id} & ${socket.id} in room ${roomId}`);

    // Notify both users of match, assigned roomId, and isOfferer boolean
    waitingUser.emit("matched", {
      roomId,
      partnerId: socket.id,
      isOfferer: true, // ✅ waitingUser becomes offerer
    });

    socket.emit("matched", {
      roomId,
      partnerId: waitingUser.id,
      isOfferer: false, // ✅ new user is answerer
    });

    waitingUser = null; // Clear waiting user
  } else {
    console.log(`⏳ No match yet. User ${socket.id} is waiting.`);
    waitingUser = socket;
  }

  /**
   * ❌ Leave room gracefully
   */
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    console.log(`👋 User ${socket.id} left room ${roomId}`);
    socket.to(roomId).emit("partner-left", { partnerId: socket.id });
  });

  /**
   * 📞 WebRTC signaling events
   */
  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
  });

  /**
   * 💬 Chat messaging
   */
  socket.on("send-message", ({ roomId, message }) => {
    console.log(`💬 Message from ${socket.id} to room ${roomId}: ${message}`);
    socket.to(roomId).emit("receive-message", { message, sender: "partner" });
  });

  /**
   * 🔌 Disconnect handler
   */
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    // Remove from waiting queue if disconnected
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }

    // Notify partners in all rooms this socket was in
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });
  });
});

// ✅ Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});

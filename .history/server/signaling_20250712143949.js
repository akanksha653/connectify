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

// ✅ Health check endpoint
app.get("/", (req, res) => {
  res.send("🚀 Signaling server is running and reachable!");
});

let waitingUser = null; // 🔗 Matchmaking queue

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // ✅ Handle user starting to look for partner
  socket.on("start-looking", () => {
    console.log(`🔎 User ${socket.id} started looking for a partner`);

    if (waitingUser && waitingUser.connected) {
      const roomId = uuidv4();

      socket.join(roomId);
      waitingUser.join(roomId);

      console.log(`🤝 Matched ${waitingUser.id} & ${socket.id} in room ${roomId}`);

      waitingUser.emit("matched", {
        roomId,
        partnerId: socket.id,
        isOfferer: true,
      });

      socket.emit("matched", {
        roomId,
        partnerId: waitingUser.id,
        isOfferer: false,
      });

      waitingUser = null;
    } else {
      console.log(`⏳ No match yet. User ${socket.id} is waiting.`);
      waitingUser = socket;
    }
  });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`✅ User ${socket.id} joined room ${roomId}`);
    socket.emit("joined-room", roomId);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    console.log(`👋 User ${socket.id} left room ${roomId}`);

    socket.to(roomId).emit("partner-left", { partnerId: socket.id });

    if (waitingUser && waitingUser.id === socket.id) {
      console.log(`🗑️ Removing ${socket.id} from waiting queue`);
      waitingUser = null;
    }
  });

  // ✅ Skip functionality (leave current room and re-queue)
  socket.on("skip", () => {
    console.log(`⏭️ User ${socket.id} skipped current partner`);

    // Remove from current room
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.leave(roomId);
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });

    // Remove from waiting queue if present
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }

    // Re-add to queue by emitting start-looking
    socket.emit("start-looking");
  });

  // 📞 WebRTC signaling events
  socket.on("offer", ({ offer, roomId }) => {
    console.log(`📤 Offer from ${socket.id} to room ${roomId}`);
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
  });

  socket.on("answer", ({ answer, roomId }) => {
    console.log(`📤 Answer from ${socket.id} to room ${roomId}`);
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    console.log(`📤 ICE candidate from ${socket.id} to room ${roomId}`);
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
  });

  // 💬 Chat messaging
  socket.on("send-message", ({ roomId, message }) => {
    console.log(`💬 Message from ${socket.id} to room ${roomId}: ${message}`);
    socket.to(roomId).emit("receive-message", { message, sender: "partner" });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    if (waitingUser && waitingUser.id === socket.id) {
      console.log(`🗑️ Removing ${socket.id} from waiting queue`);
      waitingUser = null;
    }

    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});

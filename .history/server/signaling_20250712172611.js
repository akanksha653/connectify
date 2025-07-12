const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://my-omegle-clone.vercel.app", // ✅ Update to your deployed frontend
    methods: ["GET", "POST"]
  },
});

app.get("/", (req, res) => {
  res.send("🚀 Signaling server is running!");
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("start-looking", () => {
    if (waitingUser && waitingUser.connected) {
      const roomId = uuidv4();

      socket.join(roomId);
      waitingUser.join(roomId);

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
      waitingUser = socket;
    }
  });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.emit("joined-room", roomId);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("partner-left", { partnerId: socket.id });

    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
  });

  // Skip and requeue
  socket.on("skip", () => {
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.leave(roomId);
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });

    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }

    socket.emit("start-looking");
  });

  // --- WebRTC signaling ---
  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
  });

  // --- Chat Features ---

  // Chat message
  socket.on("send-message", (msg) => {
    const { roomId } = msg;
    console.log(`💬 New message in ${roomId}:`, msg);
    socket.to(roomId).emit("receive-message", msg);
  });

  // Typing indicator
  socket.on("typing", ({ roomId, sender }) => {
    socket.to(roomId).emit("typing", { sender });
  });

  // Seen/Delivered
  socket.on("message-status", ({ roomId, messageId, status }) => {
    socket.to(roomId).emit("message-status-update", { messageId, status });
  });

  // Edit
  socket.on("edit-message", ({ roomId, messageId, content }) => {
    socket.to(roomId).emit("receive-message", {
      id: messageId,
      content,
      type: "text",
      edited: true
    });
  });

  // Delete
  socket.on("delete-message", ({ roomId, messageId }) => {
    socket.to(roomId).emit("message-deleted", { messageId });
  });

  // React
  socket.on("react-message", ({ roomId, messageId, reaction, user }) => {
    socket.to(roomId).emit("message-react", { messageId, reaction, user });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    if (waitingUser && waitingUser.id === socket.id) {
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

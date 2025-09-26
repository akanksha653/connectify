const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://connectify-hub.vercel.app", // production frontend
      "http://localhost:3000"              // local dev
    ],
    methods: ["GET", "POST"],
  },
});

app.get("/", (_, res) => {
  res.send("🚀 Combined signaling server is running!");
});

// ==========================
// 1-to-1 Anonymous Chat
// ==========================
let waitingUsers = [];

function handleOneToOne(socket) {
  socket.on("start-looking", (userInfo) => {
    const {
      gender,
      country,
      age,
      name,
      filterGender = "",
      filterCountry = "",
    } = userInfo || {};

    socket.userData = { gender, country, age, name, filterGender, filterCountry };

    // Try to find a partner
    const index = waitingUsers.findIndex((other) => {
      if (!other.connected || !other.userData) return false;

      const me = socket.userData;
      const them = other.userData;

      const mutual =
        (!them.filterGender || them.filterGender === me.gender) &&
        (!them.filterCountry || them.filterCountry.toLowerCase() === me.country?.toLowerCase()) &&
        (!me.filterGender || me.filterGender === them.gender) &&
        (!me.filterCountry || me.filterCountry.toLowerCase() === them.country?.toLowerCase());

      return mutual;
    });

    if (index !== -1) {
      const partner = waitingUsers.splice(index, 1)[0];
      const roomId = uuidv4();

      socket.join(roomId);
      partner.join(roomId);

      partner.emit("matched", {
        roomId,
        partnerId: socket.id,
        isOfferer: true,
        partnerName: socket.userData?.name || "Stranger",
        partnerAge: socket.userData?.age || "Unknown",
        partnerCountry: socket.userData?.country || "Unknown",
      });

      socket.emit("matched", {
        roomId,
        partnerId: partner.id,
        isOfferer: false,
        partnerName: partner.userData?.name || "Stranger",
        partnerAge: partner.userData?.age || "Unknown",
        partnerCountry: partner.userData?.country || "Unknown",
      });
    } else {
      waitingUsers.push(socket);
    }
  });

  socket.on("skip", () => {
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.leave(roomId);
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    socket.emit("start-looking", socket.userData);
  });
}

// ==========================
// Multi-user Rooms
// ==========================
function handleRoomChat(socket) {
  // Join a named room (e.g., "public-room-1")
  socket.on("room-join", ({ roomId, user }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = user?.name || "Guest";
    socket.emit("room-joined", { roomId });
    socket.to(roomId).emit("room-user-joined", { id: socket.id, name: socket.userName });
    console.log(`👥 ${socket.userName} joined room ${roomId}`);
  });

  // Leave a room
  socket.on("room-leave", () => {
    const roomId = socket.roomId;
    if (roomId) {
      socket.leave(roomId);
      socket.to(roomId).emit("room-user-left", { id: socket.id });
      console.log(`👋 ${socket.userName} left room ${roomId}`);
      socket.roomId = null;
    }
  });

  // Broadcast a chat message to everyone in the room
  socket.on("room-message", ({ roomId, content, type = "text" }) => {
    const msg = {
      id: uuidv4(),
      senderId: socket.id,
      senderName: socket.userName || "Guest",
      content,
      type,
      createdAt: Date.now(),
    };
    socket.to(roomId).emit("room-message", msg);
  });

  // WebRTC signaling inside rooms (multi-peer)
  socket.on("room-offer", ({ offer, targetId }) => {
    io.to(targetId).emit("room-offer", { offer, sender: socket.id });
  });

  socket.on("room-answer", ({ answer, targetId }) => {
    io.to(targetId).emit("room-answer", { answer, sender: socket.id });
  });

  socket.on("room-ice", ({ candidate, targetId }) => {
    io.to(targetId).emit("room-ice", { candidate, sender: socket.id });
  });
}

// ==========================
// Common Features
// (Used by both 1-1 & Room)
// ==========================
function handleCommon(socket) {
  // Generic WebRTC for 1-1
  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
  });

  // Chat (1-1)
  socket.on("send-message", (msg) => {
    const { roomId } = msg;
    socket.to(roomId).emit("receive-message", msg);
  });

  socket.on("typing", ({ roomId, sender }) => {
    socket.to(roomId).emit("typing", { sender });
  });

  socket.on("message-status", ({ roomId, messageId, status }) => {
    socket.to(roomId).emit("message-status-update", { messageId, status });
  });

  socket.on("edit-message", ({ roomId, messageId, content }) => {
    socket.to(roomId).emit("receive-message", {
      id: messageId,
      content,
      type: "text",
      edited: true,
    });
  });

  socket.on("delete-message", ({ roomId, messageId }) => {
    socket.to(roomId).emit("message-deleted", { messageId });
  });

  socket.on("react-message", ({ roomId, messageId, reaction, user }) => {
    socket.to(roomId).emit("message-react", { messageId, reaction, user });
  });

  // Disconnect cleanup
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);

    // Notify 1-1 partner
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });

    // Notify room members
    if (socket.roomId) {
      socket.to(socket.roomId).emit("room-user-left", { id: socket.id });
    }
  });
}

// ==========================
// Connection Entry Point
// ==========================
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);
  handleOneToOne(socket);
  handleRoomChat(socket);
  handleCommon(socket);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Combined server running on port ${PORT}`);
});

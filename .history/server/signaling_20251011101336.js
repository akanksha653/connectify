// server/signaling.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => res.send("🚀 Signaling server is running!"));

// -------------------------
// 1-1 Anonymous Chat
// -------------------------
let waitingUsers = [];

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Start Looking / Matchmaking
  socket.on("start-looking", (userInfo = {}) => {
    const { gender, country, age, name, filterGender = "", filterCountry = "" } = userInfo;
    socket.userData = { gender, country, age, name, filterGender, filterCountry };
    socket.partnerId = null;

    const index = waitingUsers.findIndex((other) => {
      if (!other.connected || !other.userData) return false;
      const my = socket.userData;
      const their = other.userData;

      const mutualMatch =
        (!their.filterGender || their.filterGender === my.gender) &&
        (!their.filterCountry || their.filterCountry.toLowerCase() === my.country?.toLowerCase()) &&
        (!my.filterGender || my.filterGender === their.gender) &&
        (!my.filterCountry || my.filterCountry.toLowerCase() === their.country?.toLowerCase());

      return mutualMatch;
    });

    if (index !== -1) {
      const partner = waitingUsers.splice(index, 1)[0];
      const roomId = uuidv4();

      socket.join(roomId);
      partner.join(roomId);

      socket.partnerId = partner.id;
      partner.partnerId = socket.id;

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

      console.log(`🤝 Matched ${socket.id} ↔ ${partner.id} in ${roomId}`);
    } else {
      waitingUsers.push(socket);
      console.log(`🕒 ${socket.id} waiting...`);
    }
  });

  // Leave / Skip / End
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("partner-left", { partnerId: socket.id });
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    socket.partnerId = null;
  });

  socket.on("skip", () => {
    console.log(`⏭️ ${socket.id} skipped`);
    if (socket.partnerId) {
      const partnerSocket = io.sockets.sockets.get(socket.partnerId);
      if (partnerSocket) {
        partnerSocket.emit("partner-left", { partnerId: socket.id });
        partnerSocket.partnerId = null;
      }
    }
    socket.partnerId = null;
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    socket.emit("start-looking", socket.userData);
  });

  // WebRTC Signaling for 1-1
  socket.on("join-room", (roomId) => {
    console.log(`📡 ${socket.id} joined WebRTC room ${roomId}`);
    socket.join(roomId);
    socket.emit("joined-room", roomId);
  });

  socket.on("offer", ({ offer, roomId }) =>
    socket.to(roomId).emit("offer", { offer, sender: socket.id })
  );

  socket.on("answer", ({ answer, roomId }) =>
    socket.to(roomId).emit("answer", { answer, sender: socket.id })
  );

  socket.on("ice-candidate", ({ candidate, roomId }) =>
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id })
  );

  // Chat / Messaging for 1-1
  socket.on("send-message", (msg) => {
    const { roomId } = msg;
    socket.to(roomId).emit("receive-message", msg);
  });

  socket.on("typing", ({ roomId, sender }) =>
    socket.to(roomId).emit("typing", { sender })
  );

  socket.on("message-status", ({ roomId, messageId, status }) =>
    socket.to(roomId).emit("message-status-update", { messageId, status })
  );

  socket.on("edit-message", ({ roomId, messageId, content }) =>
    socket.to(roomId).emit("receive-message", { id: messageId, content, type: "text", edited: true })
  );

  socket.on("delete-message", ({ roomId, messageId }) =>
    socket.to(roomId).emit("message-deleted", { messageId })
  );

  socket.on("react-message", ({ roomId, messageId, reaction, user }) =>
    socket.to(roomId).emit("message-react", { messageId, reaction, user })
  );

  socket.on("disconnect", (reason) => {
    console.log(`❌ User disconnected: ${socket.id} (${reason})`);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);

    if (socket.partnerId) {
      const partnerSocket = io.sockets.sockets.get(socket.partnerId);
      if (partnerSocket) {
        partnerSocket.emit("partner-left", { partnerId: socket.id });
        partnerSocket.partnerId = null;
      }
    }
    socket.partnerId = null;
  });
});

// -------------------------
// Room Chat Namespace
// -------------------------
const roomIO = io.of("/rooms");

// rooms: roomId -> { info: {name, topic, ...}, users: [], messages: [] }
const rooms = {};

roomIO.on("connection", (socket) => {
  console.log("✅ Room chat connected:", socket.id);

  // --- Create Room ---
  socket.on("create-room", (room) => {
    if (!room.id) return;
    rooms[room.id] = { info: room, users: [], messages: [] };
    socket.emit("room-created", rooms[room.id].info);
    roomIO.emit("rooms", Object.values(rooms).map(r => r.info));
    console.log(`🏠 Room created: ${room.name} (${room.id})`);
  });

  // --- List Rooms ---
  socket.on("list-rooms", () => {
    socket.emit("rooms", Object.values(rooms).map(r => r.info));
  });

  // --- Join Room ---
  socket.on("join-room", ({ roomId, user }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].users.push({ socketId: socket.id, ...user });
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", user);
  });

  // --- Send Message ---
  socket.on("send-message", ({ roomId, message }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].messages.push(message);
    socket.to(roomId).emit("receive-message", message);
  });

  // --- Typing ---
  socket.on("typing", ({ roomId, userId }) => {
    socket.to(roomId).emit("typing", { userId });
  });

  // --- Leave Room ---
  socket.on("leave-room", ({ roomId, userId }) => {
    if (rooms[roomId]) {
      rooms[roomId].users = rooms[roomId].users.filter(u => u.socketId !== socket.id);
      socket.to(roomId).emit("user-left", { userId });
      socket.leave(roomId);
    }
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      rooms[roomId].users = rooms[roomId].users.filter(u => u.socketId !== socket.id);
      socket.to(roomId).emit("user-left", { userId: socket.id });
    }
  });
});

// -------------------------
// Start Server
// -------------------------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Signaling server running on port ${PORT}`));

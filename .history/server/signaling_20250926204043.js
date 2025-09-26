// server/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app/",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("🚀 Signaling server is running!");
});

// ===== 1-1 Anonymous Chat =====
let waitingUsers = [];

function matchUsers(socket) {
  const index = waitingUsers.findIndex((other) => {
    if (!other.connected || !other.userData) return false;

    const my = socket.userData;
    const their = other.userData;

    const mutualFilterMatch =
      (!their.filterGender || their.filterGender === my.gender) &&
      (!their.filterCountry || their.filterCountry.toLowerCase() === my.country?.toLowerCase()) &&
      (!my.filterGender || my.filterGender === their.gender) &&
      (!my.filterCountry || my.filterCountry.toLowerCase() === their.country?.toLowerCase());

    return mutualFilterMatch;
  });

  if (index !== -1) {
    const partner = waitingUsers.splice(index, 1)[0];
    const roomId = uuidv4();

    socket.join(roomId);
    partner.join(roomId);

    // Emit match to partner
    partner.emit("matched", {
      roomId,
      partnerId: socket.id,
      isOfferer: true,
      partnerName: socket.userData?.name || "Stranger",
      partnerAge: socket.userData?.age || "Unknown",
      partnerCountry: socket.userData?.country || "Unknown",
    });

    // Emit match to socket
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
}

// ===== Room System =====
let rooms = {}; // { roomId: { id, name, topic, description, password, users: [], sockets: [] } }

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // ---------- 1-1 Anonymous Chat ----------
  socket.on("start-looking", (userInfo) => {
    socket.userData = userInfo;
    matchUsers(socket);
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

  // ---------- WebRTC Signaling for 1-1 & rooms ----------
  socket.on("offer", ({ offer, roomId, to }) => {
    socket.to(to).emit("offer", { offer, sender: socket.id });
  });

  socket.on("answer", ({ answer, roomId, to }) => {
    socket.to(to).emit("answer", { answer, sender: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, roomId, to }) => {
    socket.to(to).emit("ice-candidate", { candidate, sender: socket.id });
  });

  // ---------- Chat Features ----------
  socket.on("send-message", ({ roomId, message }) => {
    socket.to(roomId).emit("receive-message", message);
  });

  socket.on("typing", ({ roomId, sender }) => {
    socket.to(roomId).emit("typing", { sender });
  });

  socket.on("edit-message", ({ roomId, messageId, content }) => {
    socket.to(roomId).emit("receive-message", { id: messageId, content, edited: true });
  });

  socket.on("delete-message", ({ roomId, messageId }) => {
    socket.to(roomId).emit("message-deleted", { messageId });
  });

  socket.on("react-message", ({ roomId, messageId, reaction, user }) => {
    socket.to(roomId).emit("message-react", { messageId, reaction, user });
  });

  // ---------- Room System ----------
  socket.on("create-room", (roomData) => {
    const roomId = roomData.id || uuidv4();
    rooms[roomId] = { ...roomData, id: roomId, users: [] };
    io.emit("rooms", Object.values(rooms));
    socket.emit("room-created", rooms[roomId]);
  });

  socket.on("list-rooms", () => {
    socket.emit("rooms", Object.values(rooms));
  });

  socket.on("join-room-dynamic", ({ roomId, userInfo }) => {
    const room = rooms[roomId];
    if (room) {
      socket.join(roomId);
      room.users.push({ id: socket.id, userInfo });
      io.to(roomId).emit("room-update", room);
    }
  });

  socket.on("leave-room", (roomId) => {
    const room = rooms[roomId];
    if (room) {
      socket.leave(roomId);
      room.users = room.users.filter((u) => u.id !== socket.id);
      io.to(roomId).emit("room-update", room);
    }
  });

  // ---------- Disconnect ----------
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    // Remove from waitingUsers
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);

    // Remove from rooms
    Object.values(rooms).forEach((room) => {
      room.users = room.users.filter((u) => u.id !== socket.id);
      io.to(room.id).emit("room-update", room);
    });

    // Notify 1-1 partners
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

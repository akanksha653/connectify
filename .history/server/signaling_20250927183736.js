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

app.get("/", (_, res) => res.send("🚀 Signaling server running!"));

let waitingUsers = [];
let rooms = {}; // { roomId: { name, users: [socketId, ...], createdAt: timestamp } }

// ----------------------------
// 1-1 Anonymous Chat
// ----------------------------
function handleOneToOne(socket) {
  socket.on("start-looking", (userInfo) => {
    const { gender, country, age, name, filterGender = "", filterCountry = "" } = userInfo || {};
    socket.userData = { gender, country, age, name, filterGender, filterCountry };

    const index = waitingUsers.findIndex((u) => {
      if (!u.connected || !u.userData) return false;
      const me = socket.userData;
      const them = u.userData;
      return (!them.filterGender || them.filterGender === me.gender) &&
        (!them.filterCountry || them.filterCountry.toLowerCase() === me.country?.toLowerCase()) &&
        (!me.filterGender || me.filterGender === them.gender) &&
        (!me.filterCountry || me.filterCountry.toLowerCase() === them.country?.toLowerCase());
    });

    if (index !== -1) {
      const partner = waitingUsers.splice(index, 1)[0];
      const roomId = uuidv4();

      // join both users to temporary room immediately
      socket.join(roomId);
      partner.join(roomId);

      // notify both
      partner.emit("matched", { roomId, partnerId: socket.id, isOfferer: true, partnerName: socket.userData?.name || "Stranger", partnerAge: socket.userData?.age || "Unknown", partnerCountry: socket.userData?.country || "Unknown" });
      socket.emit("matched", { roomId, partnerId: partner.id, isOfferer: false, partnerName: partner.userData?.name || "Stranger", partnerAge: partner.userData?.age || "Unknown", partnerCountry: partner.userData?.country || "Unknown" });
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

// ----------------------------
// Dynamic Room Chat System
// ----------------------------
function handleRoomChat(socket) {
  // create room
  socket.on("create-room", ({ name }) => {
    const roomId = uuidv4();
    rooms[roomId] = { name: name || "Untitled Room", users: [socket.id], createdAt: Date.now() };
    socket.join(roomId);
    socket.emit("room-created", { roomId, name: rooms[roomId].name });
    io.emit("rooms-update", rooms);
    console.log(`📦 Room created: ${roomId} by ${socket.id}`);
  });

  // join room
  socket.on("join-room", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("error", { message: "Room does not exist" });
    if (!room.users.includes(socket.id)) room.users.push(socket.id);
    socket.join(roomId);
    socket.emit("room-joined", { roomId, name: room.name });
    io.to(roomId).emit("user-joined", { userId: socket.id });
    io.emit("rooms-update", rooms);
    console.log(`${socket.id} joined room ${roomId}`);
  });

  // leave room
  socket.on("leave-room", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.users = room.users.filter(id => id !== socket.id);
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { userId: socket.id });

    // do not delete immediately, keep for Render free server idle time
    // you can optionally delete after X minutes if you want auto cleanup
    io.emit("rooms-update", rooms);
    console.log(`${socket.id} left room ${roomId}`);
  });

  // room chat messages
  socket.on("room-message", ({ roomId, content, type = "text" }) => {
    socket.to(roomId).emit("room-message", { id: uuidv4(), senderId: socket.id, content, type, createdAt: Date.now() });
  });

  // room WebRTC signaling
  socket.on("room-offer", ({ offer, targetId }) => io.to(targetId).emit("room-offer", { offer, sender: socket.id }));
  socket.on("room-answer", ({ answer, targetId }) => io.to(targetId).emit("room-answer", { answer, sender: socket.id }));
  socket.on("room-ice", ({ candidate, targetId }) => io.to(targetId).emit("room-ice", { candidate, sender: socket.id }));
}

// ----------------------------
// Common Features
// ----------------------------
function handleCommon(socket) {
  // 1-1 signaling
  socket.on("offer", ({ offer, roomId }) => socket.to(roomId).emit("offer", { offer, sender: socket.id }));
  socket.on("answer", ({ answer, roomId }) => socket.to(roomId).emit("answer", { answer, sender: socket.id }));
  socket.on("ice-candidate", ({ candidate, roomId }) => socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id }));

  // 1-1 chat
  socket.on("send-message", (msg) => socket.to(msg.roomId).emit("receive-message", msg));
  socket.on("typing", ({ roomId, sender }) => socket.to(roomId).emit("typing", { sender }));
  socket.on("message-status", ({ roomId, messageId, status }) => socket.to(roomId).emit("message-status-update", { messageId, status }));
  socket.on("edit-message", ({ roomId, messageId, content }) => socket.to(roomId).emit("receive-message", { id: messageId, content, type: "text", edited: true }));
  socket.on("delete-message", ({ roomId, messageId }) => socket.to(roomId).emit("message-deleted", { messageId }));
  socket.on("react-message", ({ roomId, messageId, reaction, user }) => socket.to(roomId).emit("message-react", { messageId, reaction, user }));

  // disconnect cleanup
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    waitingUsers = waitingUsers.filter(s => s.id !== socket.id);

    // leave rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.users = room.users.filter(id => id !== socket.id);
      socket.to(roomId).emit("user-left", { userId: socket.id });
    }

    // 1-1 partner notifications
    socket.rooms.forEach(roomId => {
      if (roomId !== socket.id) socket.to(roomId).emit("partner-left", { partnerId: socket.id });
    });

    io.emit("rooms-update", rooms);
  });
}

// ----------------------------
// Connection Entry
// ----------------------------
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  handleOneToOne(socket);
  handleRoomChat(socket);
  handleCommon(socket);

  // send current rooms to new user
  socket.emit("rooms-update", rooms);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

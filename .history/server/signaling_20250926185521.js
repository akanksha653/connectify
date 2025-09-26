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

// ------------------ 1-1 anonymous chat ------------------
let waitingUsers = [];

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("start-looking", (userInfo) => {
    const { gender, country, age, name, filterGender = "", filterCountry = "" } = userInfo || {};
    socket.userData = { gender, country, age, name, filterGender, filterCountry };

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

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.emit("joined-room", roomId);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("partner-left", { partnerId: socket.id });
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
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

  // WebRTC signaling for 1-1
  socket.on("offer", ({ offer, roomId }) => socket.to(roomId).emit("offer", { offer, sender: socket.id }));
  socket.on("answer", ({ answer, roomId }) => socket.to(roomId).emit("answer", { answer, sender: socket.id }));
  socket.on("ice-candidate", ({ candidate, roomId }) => socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id }));

  // Chat features for 1-1
  socket.on("send-message", (msg) => {
    const { roomId } = msg;
    socket.to(roomId).emit("receive-message", msg);
  });
  socket.on("typing", ({ roomId, sender }) => socket.to(roomId).emit("typing", { sender }));
  socket.on("message-status", ({ roomId, messageId, status }) => socket.to(roomId).emit("message-status-update", { messageId, status }));
  socket.on("edit-message", ({ roomId, messageId, content }) => socket.to(roomId).emit("receive-message", { id: messageId, content, type: "text", edited: true }));
  socket.on("delete-message", ({ roomId, messageId }) => socket.to(roomId).emit("message-deleted", { messageId }));
  socket.on("react-message", ({ roomId, messageId, reaction, user }) => socket.to(roomId).emit("message-react", { messageId, reaction, user }));

  // ------------------ Rooms system ------------------
  let rooms = io.sockets.adapter.roomsMap || {}; // stores all rooms
  if (!socket.roomsList) socket.roomsList = new Set();

  socket.on("list-rooms", () => {
    const allRooms = Array.from(io.sockets.adapter.rooms.entries())
      .filter(([roomId, s]) => !io.sockets.sockets.has(roomId))
      .map(([roomId, s]) => ({
        id: roomId,
        name: `Room ${roomId.substring(0, 5)}`,
        topic: "General",
        description: "",
        userCount: s.size,
        hasPassword: false,
      }));
    socket.emit("rooms", allRooms);
  });

  socket.on("create-room", (roomData) => {
    const roomId = uuidv4();
    socket.join(roomId);
    socket.roomsList.add(roomId);

    const newRoom = {
      id: roomId,
      name: roomData.name,
      topic: roomData.topic,
      description: roomData.description || "",
      userCount: 1,
      hasPassword: !!roomData.password,
    };

    io.emit("room-created", newRoom);
  });

  socket.on("join-room-dynamic", ({ roomId, password }) => {
    socket.join(roomId);
    socket.roomsList.add(roomId);
    io.to(roomId).emit("room-update", { id: roomId, users: Array.from(io.sockets.adapter.rooms.get(roomId) || []) });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);

    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) socket.to(roomId).emit("partner-left", { partnerId: socket.id });
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Signaling server running on port ${PORT}`));

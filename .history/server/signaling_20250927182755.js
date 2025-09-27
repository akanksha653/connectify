const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app/", // ✅ your frontend
    methods: ["GET", "POST"]
  },
});

app.get("/", (_, res) => res.send("🚀 1-1 + Room Signaling is running!"));

// ------------------ DATA STORES ------------------
let waitingUsers = [];           // for 1-1 anonymous matching
let publicRooms  = {};           // { roomId: {name, members:[]} }

// --------------------------------------------------
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // ======== 1-1 ANONYMOUS MATCHING =========
  socket.on("start-looking", (userInfo) => {
    const {
      gender, country, age, name,
      filterGender = "", filterCountry = ""
    } = userInfo || {};

    socket.userData = { gender, country, age, name, filterGender, filterCountry };

    const index = waitingUsers.findIndex(other => {
      if (!other.connected || !other.userData) return false;

      const my = socket.userData;
      const their = other.userData;

      const match =
        (!their.filterGender || their.filterGender === my.gender) &&
        (!their.filterCountry || their.filterCountry.toLowerCase() === my.country?.toLowerCase()) &&
        (!my.filterGender   || my.filterGender === their.gender) &&
        (!my.filterCountry  || my.filterCountry.toLowerCase() === their.country?.toLowerCase());

      return match;
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
        partnerAge:  socket.userData?.age  || "Unknown",
        partnerCountry: socket.userData?.country || "Unknown"
      });

      socket.emit("matched", {
        roomId,
        partnerId: partner.id,
        isOfferer: false,
        partnerName: partner.userData?.name || "Stranger",
        partnerAge:  partner.userData?.age  || "Unknown",
        partnerCountry: partner.userData?.country || "Unknown"
      });
    } else {
      waitingUsers.push(socket);
    }
  });

  socket.on("skip", () => {
    leaveAllRoomsExceptSelf(socket);
    waitingUsers = waitingUsers.filter(s => s.id !== socket.id);
    socket.emit("start-looking", socket.userData);
  });

  // ======== PUBLIC ROOM SYSTEM =========
  socket.on("create-room", ({ name }) => {
    const roomId = uuidv4();
    publicRooms[roomId] = { name: name || "Untitled Room", members: [] };
    socket.join(roomId);
    publicRooms[roomId].members.push(socket.id);
    socket.emit("room-created", { roomId, name: publicRooms[roomId].name });
    io.emit("rooms-updated", publicRooms);
    console.log(`📦 Room created ${roomId}`);
  });

  socket.on("join-room", ({ roomId }) => {
    const room = publicRooms[roomId];
    if (!room) return socket.emit("error", { message: "Room does not exist" });

    socket.join(roomId);
    room.members.push(socket.id);
    socket.emit("room-joined", { roomId, name: room.name });
    socket.to(roomId).emit("user-joined", { userId: socket.id });
    io.emit("rooms-updated", publicRooms);
    console.log(`${socket.id} joined ${roomId}`);
  });

  socket.on("leave-room", ({ roomId }) => {
    socket.leave(roomId);
    removeMemberFromRoom(roomId, socket.id);
  });

  socket.on("list-rooms", () => {
    socket.emit("rooms-updated", publicRooms);
  });

  // ======== COMMON WEBRTC / CHAT =========
  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
  });

  socket.on("send-message", (msg) => {
    socket.to(msg.roomId).emit("receive-message", msg);
  });

  socket.on("typing", ({ roomId, sender }) => {
    socket.to(roomId).emit("typing", { sender });
  });

  socket.on("edit-message", ({ roomId, messageId, content }) => {
    socket.to(roomId).emit("receive-message", {
      id: messageId,
      content,
      type: "text",
      edited: true
    });
  });

  socket.on("delete-message", ({ roomId, messageId }) => {
    socket.to(roomId).emit("message-deleted", { messageId });
  });

  socket.on("react-message", ({ roomId, messageId, reaction, user }) => {
    socket.to(roomId).emit("message-react", { messageId, reaction, user });
  });

  // ======== CLEAN UP =========
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    waitingUsers = waitingUsers.filter(s => s.id !== socket.id);
    leaveAllRoomsExceptSelf(socket);
  });

  function leaveAllRoomsExceptSelf(s) {
    s.rooms.forEach(r => {
      if (r !== s.id) {
        s.to(r).emit("partner-left", { partnerId: s.id });
        s.leave(r);
        removeMemberFromRoom(r, s.id);
      }
    });
  }

  function removeMemberFromRoom(roomId, userId) {
    if (!publicRooms[roomId]) return;
    publicRooms[roomId].members = publicRooms[roomId].members.filter(id => id !== userId);
    if (publicRooms[roomId].members.length === 0) {
      delete publicRooms[roomId];   // delete empty room
    }
    io.emit("rooms-updated", publicRooms);
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`🚀 Signaling server running on port ${PORT}`)
);

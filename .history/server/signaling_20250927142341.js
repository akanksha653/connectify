const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app", // ✅ Your frontend URL
    methods: ["GET", "POST"]
  },
});

app.get("/", (_, res) => res.send("🚀 Combined signaling server is running!"));

/* ---------- STATE ---------- */
let waitingUsers = []; // for 1-1 matchmaking
const groupRooms = {}; // { roomId: Set(socketId) }

/* ---------- SOCKET LOGIC ---------- */
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  /* ===== 1️⃣  Anonymous 1-on-1 Matching ===== */
  socket.on("start-looking", (userInfo) => {
    const {
      gender,
      country,
      age,
      name,
      filterGender = "",
      filterCountry = ""
    } = userInfo || {};

    socket.userData = { gender, country, age, name, filterGender, filterCountry };

    const index = waitingUsers.findIndex((other) => {
      if (!other.connected || !other.userData) return false;
      const my = socket.userData;
      const their = other.userData;

      const mutual =
        (!their.filterGender || their.filterGender === my.gender) &&
        (!their.filterCountry || their.filterCountry.toLowerCase() === my.country?.toLowerCase()) &&
        (!my.filterGender || my.filterGender === their.gender) &&
        (!my.filterCountry || my.filterCountry.toLowerCase() === their.country?.toLowerCase());
      return mutual;
    });

    if (index !== -1) {
      const partner = waitingUsers.splice(index, 1)[0];
      const roomId = uuidv4();

      socket.join(roomId);
      partner.join(roomId);

      const emitMatch = (s, p, offerer) => s.emit("matched", {
        roomId,
        partnerId: p.id,
        isOfferer: offerer,
        partnerName: p.userData?.name || "Stranger",
        partnerAge: p.userData?.age || "Unknown",
        partnerCountry: p.userData?.country || "Unknown"
      });

      emitMatch(socket, partner, true);
      emitMatch(partner, socket, false);
    } else {
      waitingUsers.push(socket);
    }
  });

  socket.on("skip", () => {
    leaveAllRooms(socket, true);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    socket.emit("start-looking", socket.userData);
  });

  /* ===== 2️⃣  Group Rooms ===== */
  socket.on("create-room", () => {
    const roomId = uuidv4();
    joinGroupRoom(socket, roomId);
    socket.emit("room-created", { roomId });
  });

  socket.on("join-room", (roomId) => joinGroupRoom(socket, roomId));
  socket.on("leave-room", (roomId) => leaveGroupRoom(socket, roomId));

  /* ===== 3️⃣  WebRTC Signaling ===== */
  socket.on("offer", ({ offer, roomId }) =>
    socket.to(roomId).emit("offer", { offer, sender: socket.id })
  );
  socket.on("answer", ({ answer, roomId }) =>
    socket.to(roomId).emit("answer", { answer, sender: socket.id })
  );
  socket.on("ice-candidate", ({ candidate, roomId }) =>
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id })
  );

  /* ===== 4️⃣  Chat Features ===== */
  socket.on("send-message", (msg) => {
    console.log(`💬 Message in ${msg.roomId}:`, msg);
    socket.to(msg.roomId).emit("receive-message", msg);
  });

  socket.on("typing", ({ roomId, sender }) =>
    socket.to(roomId).emit("typing", { sender })
  );

  socket.on("message-status", ({ roomId, messageId, status }) =>
    socket.to(roomId).emit("message-status-update", { messageId, status })
  );

  socket.on("edit-message", ({ roomId, messageId, content }) =>
    socket.to(roomId).emit("receive-message", {
      id: messageId,
      content,
      type: "text",
      edited: true
    })
  );

  socket.on("delete-message", ({ roomId, messageId }) =>
    socket.to(roomId).emit("message-deleted", { messageId })
  );

  socket.on("react-message", ({ roomId, messageId, reaction, user }) =>
    socket.to(roomId).emit("message-react", { messageId, reaction, user })
  );

  /* ===== Disconnect ===== */
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    leaveAllRooms(socket, false);
  });
});

/* ---------- Helpers ---------- */
function joinGroupRoom(socket, roomId) {
  if (!groupRooms[roomId]) groupRooms[roomId] = new Set();
  groupRooms[roomId].add(socket.id);
  socket.join(roomId);
  socket.emit("joined-room", { roomId, members: [...groupRooms[roomId]] });
  socket.to(roomId).emit("user-joined", { userId: socket.id });
}

function leaveGroupRoom(socket, roomId) {
  if (groupRooms[roomId]) {
    groupRooms[roomId].delete(socket.id);
    if (groupRooms[roomId].size === 0) delete groupRooms[roomId];
  }
  socket.leave(roomId);
  socket.to(roomId).emit("user-left", { userId: socket.id });
}

function leaveAllRooms(socket, notify1v1) {
  socket.rooms.forEach((roomId) => {
    if (roomId !== socket.id) {
      if (notify1v1) socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      leaveGroupRoom(socket, roomId);
    }
  });
}

/* ---------- START ---------- */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Combined server running on ${PORT}`));

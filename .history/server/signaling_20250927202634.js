const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app", // your frontend
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

// ----------------------
// Data stores
// ----------------------
let waitingUsers = []; // for 1-1
let rooms = {};        // { roomId: { name, users:[socketId], createdAt } }

// ----------------------
// REST APIs
// ----------------------

// root
app.get("/", (_, res) => {
  res.send("🚀 Signaling + Room server is running!");
});

// list all public rooms
app.get("/rooms", (_, res) => {
  const list = Object.entries(rooms).map(([roomId, r]) => ({
    roomId,
    name: r.name,
    usersCount: r.users.length,
    createdAt: r.createdAt,
  }));
  res.json(list);
});

// ----------------------
// Socket.IO
// ----------------------
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // ---------- 1-1 RANDOM CHAT ----------
  socket.on("start-looking", (userInfo) => {
    const { gender, country, age, name,
            filterGender = "", filterCountry = "" } = userInfo || {};
    socket.userData = { gender, country, age, name, filterGender, filterCountry };

    const index = waitingUsers.findIndex((other) => {
      if (!other.connected || !other.userData) return false;
      const my = socket.userData;
      const their = other.userData;
      return (!their.filterGender || their.filterGender === my.gender) &&
             (!their.filterCountry || their.filterCountry.toLowerCase() === my.country?.toLowerCase()) &&
             (!my.filterGender || my.filterGender === their.gender) &&
             (!my.filterCountry || my.filterCountry.toLowerCase() === their.country?.toLowerCase());
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
        partnerCountry: socket.userData?.country || "Unknown"
      });

      socket.emit("matched", {
        roomId,
        partnerId: partner.id,
        isOfferer: false,
        partnerName: partner.userData?.name || "Stranger",
        partnerAge: partner.userData?.age || "Unknown",
        partnerCountry: partner.userData?.country || "Unknown"
      });
    } else {
      waitingUsers.push(socket);
    }
  });

  socket.on("skip", () => {
    socket.rooms.forEach((r) => {
      if (r !== socket.id) {
        socket.leave(r);
        socket.to(r).emit("partner-left", { partnerId: socket.id });
      }
    });
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    socket.emit("start-looking", socket.userData);
  });

  // ---------- PUBLIC ROOMS ----------
  // create a room
  socket.on("create-room", ({ name }) => {
    const roomId = uuidv4();
    rooms[roomId] = {
      name: name || "Untitled Room",
      users: [socket.id],
      createdAt: Date.now()
    };
    socket.join(roomId);
    socket.emit("room-created", { roomId, name: rooms[roomId].name });
    io.emit("rooms-update", rooms);
    console.log(`📦 Room created: ${roomId}`);
  });

  // join a room
  socket.on("join-room", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("error", { message: "Room does not exist" });
    if (!room.users.includes(socket.id)) room.users.push(socket.id);
    socket.join(roomId);
    socket.emit("room-joined", { roomId, name: room.name });
    socket.to(roomId).emit("user-joined", { userId: socket.id });
    io.emit("rooms-update", rooms);
    console.log(`${socket.id} joined room ${roomId}`);
  });

  // leave a room
  socket.on("leave-room", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.users = room.users.filter((id) => id !== socket.id);
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { userId: socket.id });
    checkRoomEmpty(roomId);
  });

  // room chat + WebRTC signals
  socket.on("room-message", ({ roomId, content, type = "text" }) => {
    socket.to(roomId).emit("room-message", {
      id: uuidv4(),
      senderId: socket.id,
      content,
      type,
      createdAt: Date.now()
    });
  });
  socket.on("room-offer", ({ offer, targetId }) =>
    io.to(targetId).emit("room-offer", { offer, sender: socket.id })
  );
  socket.on("room-answer", ({ answer, targetId }) =>
    io.to(targetId).emit("room-answer", { answer, sender: socket.id })
  );
  socket.on("room-ice", ({ candidate, targetId }) =>
    io.to(targetId).emit("room-ice", { candidate, sender: socket.id })
  );

  // ---------- COMMON SIGNALING ----------
  socket.on("offer", ({ offer, roomId }) =>
    socket.to(roomId).emit("offer", { offer, sender: socket.id })
  );
  socket.on("answer", ({ answer, roomId }) =>
    socket.to(roomId).emit("answer", { answer, sender: socket.id })
  );
  socket.on("ice-candidate", ({ candidate, roomId }) =>
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id })
  );

  // 1-1 / group chat helpers
  socket.on("send-message", (msg) =>
    socket.to(msg.roomId).emit("receive-message", msg)
  );
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

  // ---------- Disconnect cleanup ----------
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    for (const roomId in rooms) {
      const r = rooms[roomId];
      r.users = r.users.filter((id) => id !== socket.id);
      socket.to(roomId).emit("user-left", { userId: socket.id });
      checkRoomEmpty(roomId);
    }
  });

  // send current public rooms on connect
  socket.emit("rooms-update", rooms);
});

// helper to delete empty room after 10 min
function checkRoomEmpty(roomId) {
  const r = rooms[roomId];
  if (r && r.users.length === 0) {
    setTimeout(() => {
      if (rooms[roomId] && rooms[roomId].users.length === 0) {
        delete rooms[roomId];
        io.emit("rooms-update", rooms);
        console.log(`🗑️ Room deleted: ${roomId}`);
      }
    }, 10 * 60 * 1000);
    io.emit("rooms-update", rooms);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`🚀 Combined server running on port ${PORT}`)
);

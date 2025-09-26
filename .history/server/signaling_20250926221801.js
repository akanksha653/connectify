const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app/", // Your frontend URL
    methods: ["GET", "POST"]
  },
});

app.get("/", (req, res) => {
  res.send("🚀 Signaling server running!");
});

/** ----- 1-1 Anonymous Chat ----- */
let waitingUsers = [];

/** ----- Rooms ----- */
const rooms = {}; // { roomId: { id, name, topic, description, users: [socketId] } }

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  /** ----------------- 1-1 Anonymous Chat ----------------- */
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
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.leave(roomId);
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    socket.emit("start-looking", socket.userData);
  });

  /** ----------------- Room System ----------------- */
  socket.on("create-room", (roomData) => {
    const roomId = uuidv4();
    rooms[roomId] = {
      id: roomId,
      name: roomData.name,
      topic: roomData.topic,
      description: roomData.description || "",
      password: roomData.password || null,
      users: [],
    };
    socket.emit("room-created", rooms[roomId]);
    io.emit("rooms", Object.values(rooms));
    console.log(`🟢 Room created: ${roomData.name} (${roomId})`);
  });

  socket.on("list-rooms", () => {
    socket.emit("rooms", Object.values(rooms));
  });

  socket.on("join-room", ({ roomId, userInfo }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit("error", "Room does not exist");
      return;
    }
    if (room.password && room.password !== userInfo.password) {
      socket.emit("error", "Incorrect password");
      return;
    }
    socket.join(roomId);
    socket.userData = { ...userInfo, socketId: socket.id };
    room.users.push(socket.id);

    io.to(roomId).emit("room-update", {
      ...room,
      users: room.users.map((id) => io.sockets.sockets.get(id)?.userData || id),
    });

    console.log(`🟡 User ${userInfo.name} joined room ${room.name}`);
  });

  socket.on("leave-room", ({ roomId }) => {
    const room = rooms[roomId];
    if (room) {
      socket.leave(roomId);
      room.users = room.users.filter((id) => id !== socket.id);
      io.to(roomId).emit("room-update", {
        ...room,
        users: room.users.map((id) => io.sockets.sockets.get(id)?.userData || id),
      });
    }
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
  });

  /** ----------------- WebRTC Signaling (works for both systems) ----------------- */
  socket.on("offer", ({ offer, roomId }) => socket.to(roomId).emit("offer", { offer, sender: socket.id }));
  socket.on("answer", ({ answer, roomId }) => socket.to(roomId).emit("answer", { answer, sender: socket.id }));
  socket.on("ice-candidate", ({ candidate, roomId }) => socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id }));

  /** ----------------- Chat ----------------- */
  socket.on("send-message", ({ roomId, message }) => socket.to(roomId).emit("receive-message", message));
  socket.on("typing", ({ roomId, sender }) => socket.to(roomId).emit("typing", { sender }));

  /** ----------------- Disconnect ----------------- */
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    Object.values(rooms).forEach((room) => {
      if (room.users.includes(socket.id)) {
        room.users = room.users.filter((id) => id !== socket.id);
        io.to(room.id).emit("room-update", {
          ...room,
          users: room.users.map((id) => io.sockets.sockets.get(id)?.userData || id),
        });
      }
    });

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

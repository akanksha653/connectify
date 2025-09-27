const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all or replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

// ----------------------------
// Rooms storage
// ----------------------------
let rooms = {}; 
// rooms: { roomId: { name, users: [{ id, userInfo }], createdAt } }

// List rooms API
app.get("/rooms", (_, res) => {
  const roomList = Object.entries(rooms).map(([id, room]) => ({
    id,
    name: room.name,
    usersCount: room.users.length,
    createdAt: room.createdAt,
  }));
  res.json(roomList);
});

// ----------------------------
// Socket.IO
// ----------------------------
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Create room
  socket.on("create-room", ({ name, topic, password, userInfo }) => {
    const roomId = uuidv4();
    rooms[roomId] = {
      name: name || "Untitled Room",
      topic: topic || "",
      password: password || null,
      users: [{ id: socket.id, userInfo }],
      createdAt: Date.now(),
    };
    socket.join(roomId);
    socket.emit("room-created", { roomId, ...rooms[roomId] });
    io.emit("rooms-update", rooms);
    console.log(`📦 Room created: ${roomId} by ${socket.id}`);
  });

  // Join a room
  socket.on("join-room-dynamic", ({ roomId, userInfo }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("error", { message: "Room does not exist" });

    // Add user if not already present
    if (!room.users.find((u) => u.id === socket.id)) {
      room.users.push({ id: socket.id, userInfo });
    }

    socket.join(roomId);
    socket.emit("room-joined", { roomId, ...room });
    socket.to(roomId).emit("user-joined", { id: socket.id, userInfo });
    io.emit("rooms-update", rooms);
    console.log(`${socket.id} joined room ${roomId}`);
  });

  // Leave a room
  socket.on("leave-room", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.users = room.users.filter((u) => u.id !== socket.id);
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { id: socket.id });

    // Delete room if empty after 10 min inactivity
    if (room.users.length === 0) {
      setTimeout(() => {
        if (rooms[roomId]?.users.length === 0) {
          delete rooms[roomId];
          io.emit("rooms-update", rooms);
          console.log(`🗑️ Room deleted due to inactivity: ${roomId}`);
        }
      }, 10 * 60 * 1000); // 10 min
    }

    io.emit("rooms-update", rooms);
    console.log(`${socket.id} left room ${roomId}`);
  });

  // Chat in room
  socket.on("room-message", ({ roomId, id, user, text, timestamp }) => {
    socket.to(roomId).emit("room-message", { roomId, id, user, text, timestamp });
  });

  // WebRTC signaling
  socket.on("room-offer", ({ to, offer }) => io.to(to).emit("room-offer", { offer, sender: socket.id }));
  socket.on("room-answer", ({ to, answer }) => io.to(to).emit("room-answer", { answer, sender: socket.id }));
  socket.on("room-ice", ({ to, candidate }) => io.to(to).emit("room-ice", { candidate, sender: socket.id }));

  // Disconnect handling
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.users = room.users.filter((u) => u.id !== socket.id);
      socket.to(roomId).emit("user-left", { id: socket.id });

      // Delete room if empty after 10 min inactivity
      if (room.users.length === 0) {
        setTimeout(() => {
          if (rooms[roomId]?.users.length === 0) {
            delete rooms[roomId];
            io.emit("rooms-update", rooms);
            console.log(`🗑️ Room deleted due to inactivity: ${roomId}`);
          }
        }, 10 * 60 * 1000);
      }
    }
    io.emit("rooms-update", rooms);
  });

  // Send current rooms to new user
  socket.emit("rooms-update", rooms);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Room server running on port ${PORT}`));

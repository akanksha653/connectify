const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app/", // Replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

// ----------------------------
// Rooms storage
// ----------------------------
let rooms = {}; 
// rooms structure: { roomId: { name: string, users: [socketId, ...], createdAt: timestamp } }

// ----------------------------
// API to list rooms
// ----------------------------
app.get("/rooms", (_, res) => {
  const roomList = Object.entries(rooms).map(([roomId, room]) => ({
    roomId,
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
  socket.on("create-room", ({ name }) => {
    const roomId = uuidv4();
    rooms[roomId] = { name: name || "Untitled Room", users: [socket.id], createdAt: Date.now() };
    socket.join(roomId);
    socket.emit("room-created", { roomId, name: rooms[roomId].name });
    io.emit("rooms-update", rooms); // broadcast updated room list
    console.log(`📦 Room created: ${roomId} by ${socket.id}`);
  });

  // Join room
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

  // Leave room
  socket.on("leave-room", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.users = room.users.filter(id => id !== socket.id);
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { userId: socket.id });

    if (room.users.length === 0) {
      setTimeout(() => {
        if (rooms[roomId]?.users.length === 0) {
          delete rooms[roomId];
          io.emit("rooms-update", rooms);
          console.log(`🗑️ Room deleted due to inactivity: ${roomId}`);
        }
      }, 10 * 60 * 1000);
    }

    io.emit("rooms-update", rooms);
    console.log(`${socket.id} left room ${roomId}`);
  });

  // Chat in room
  socket.on("room-message", ({ roomId, content, type = "text" }) => {
    socket.to(roomId).emit("room-message", {
      id: uuidv4(),
      senderId: socket.id,
      content,
      type,
      createdAt: Date.now(),
    });
  });

  // WebRTC signaling
  socket.on("room-offer", ({ offer, targetId }) => io.to(targetId).emit("room-offer", { offer, sender: socket.id }));
  socket.on("room-answer", ({ answer, targetId }) => io.to(targetId).emit("room-answer", { answer, sender: socket.id }));
  socket.on("room-ice", ({ candidate, targetId }) => io.to(targetId).emit("room-ice", { candidate, sender: socket.id }));

  // Disconnect cleanup
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.users = room.users.filter(id => id !== socket.id);
      socket.to(roomId).emit("user-left", { userId: socket.id });

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

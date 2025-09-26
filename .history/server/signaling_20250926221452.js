const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Update with your frontend URL
    methods: ["GET", "POST"]
  },
});

app.get("/", (req, res) => {
  res.send("🚀 Multi-user signaling server running!");
});

// Store rooms and users
const rooms = {}; // { roomId: { id, name, topic, description, password, users: [socketId] } }

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  /** CREATE ROOM */
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
    io.emit("rooms", Object.values(rooms)); // update all clients
    console.log(`🟢 Room created: ${roomData.name} (${roomId})`);
  });

  /** LIST ROOMS */
  socket.on("list-rooms", () => {
    socket.emit("rooms", Object.values(rooms));
  });

  /** JOIN ROOM */
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

  /** LEAVE ROOM */
  socket.on("leave-room", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    socket.leave(roomId);
    room.users = room.users.filter((id) => id !== socket.id);

    io.to(roomId).emit("room-update", {
      ...room,
      users: room.users.map((id) => io.sockets.sockets.get(id)?.userData || id),
    });
    console.log(`🔴 User ${socket.id} left room ${roomId}`);
  });

  /** WebRTC Signaling */
  socket.on("room-offer", ({ offer, to, roomId }) => {
    io.to(to).emit("room-offer", { from: socket.id, offer, name: socket.userData?.name, roomId });
  });

  socket.on("room-answer", ({ answer, to }) => {
    io.to(to).emit("room-answer", { from: socket.id, answer });
  });

  socket.on("room-ice", ({ candidate, to }) => {
    io.to(to).emit("room-ice", { from: socket.id, candidate });
  });

  /** Chat features inside room */
  socket.on("send-message", ({ roomId, message }) => {
    socket.to(roomId).emit("receive-message", message);
  });

  socket.on("typing", ({ roomId, sender }) => {
    socket.to(roomId).emit("typing", { sender });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    // Remove from all rooms
    Object.values(rooms).forEach((room) => {
      if (room.users.includes(socket.id)) {
        room.users = room.users.filter((id) => id !== socket.id);
        io.to(room.id).emit("room-update", {
          ...room,
          users: room.users.map((id) => io.sockets.sockets.get(id)?.userData || id),
        });
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

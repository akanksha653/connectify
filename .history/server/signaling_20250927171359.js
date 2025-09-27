const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",        // <-- allow your frontend domain
    methods: ["GET","POST"],
  },
});

app.get("/", (_, res) => res.send("🚀 Group Room Signaling is running!"));

io.on("connection", (socket) => {
  console.log("✅ user connected:", socket.id);

  // create a new room
  socket.on("create-room", () => {
    const roomId = uuidv4();
    socket.join(roomId);
    socket.emit("room-created", { roomId });
    console.log(`📦 room created ${roomId} by ${socket.id}`);
  });

  // join an existing room
  socket.on("join-room", ({ roomId }) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) {
      socket.emit("error", { message: "Room does not exist" });
      return;
    }
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", { userId: socket.id });
    socket.emit("room-joined", { roomId });
    console.log(`${socket.id} joined ${roomId}`);
  });

  // leave
  socket.on("leave-room", ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { userId: socket.id });
    console.log(`${socket.id} left ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ user disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`🚀 Signaling server running on http://localhost:${PORT}`)
);

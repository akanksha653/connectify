// server/signaling.js

const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const io = new Server(PORT, {
  cors: {
    origin: "*", // ⚠️ Replace with your frontend URL in production for security
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  /**
   * User joins a room
   */
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`📥 User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  /**
   * Handle offer
   */
  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
  });

  /**
   * Handle answer
   */
  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
  });

  /**
   * Handle ICE candidates
   */
  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
  });

  /**
   * Handle disconnect
   */
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

console.log(`🚀 Signaling server is running on port ${PORT}`);

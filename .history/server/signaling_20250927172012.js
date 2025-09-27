const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app/", // your frontend domain
    methods: ["GET", "POST"]
  }
});

app.get("/", (_, res) => res.send("🚀 Combined signaling server is running!"));

/* ------------------- 1-1 Anonymous Matching ------------------- */
let waitingUsers = [];

/* ------------------- Group Room Helpers ------------------- */
// Optional: you can track active rooms if you need extra metadata
const groupRooms = new Map();

/* ------------------- Socket.io ------------------- */
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  /* ---------- 1-1 Anonymous Match ---------- */
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

    // Try to find a partner
    const index = waitingUsers.findIndex((other) => {
      if (!other.connected || !other.userData) return false;
      const my = socket.userData;
      const their = other.userData;

      const mutualMatch =
        (!their.filterGender || their.filterGender === my.gender) &&
        (!their.filterCountry || their.filterCountry.toLowerCase() === my.country?.toLowerCase()) &&
        (!my.filterGender || my.filterGender === their.gender) &&
        (!my.filterCountry || my.filterCountry.toLowerCase() === their.country?.toLowerCase());

      return mutualMatch;
    });

    if (index !== -1) {
      const partner = waitingUsers.splice(index, 1)[0];
      const roomId = uuidv4();

      socket.join(roomId);
      partner.join(roomId);

      // Notify both users
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

  /* ---------- 1-1 Chat / WebRTC ---------- */
  socket.on("offer", ({ offer, roomId }) =>
    socket.to(roomId).emit("offer", { offer, sender: socket.id })
  );
  socket.on("answer", ({ answer, roomId }) =>
    socket.to(roomId).emit("answer", { answer, sender: socket.id })
  );
  socket.on("ice-candidate", ({ candidate, roomId }) =>
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id })
  );

  socket.on("send-message", (msg) => {
    socket.to(msg.roomId).emit("receive-message", msg);
  });
  socket.on("typing", ({ roomId, sender }) =>
    socket.to(roomId).emit("typing", { sender })
  );
  socket.on("message-status", (data) =>
    socket.to(data.roomId).emit("message-status-update", data)
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
  socket.on("react-message", (data) =>
    socket.to(data.roomId).emit("message-react", data)
  );

  /* ---------- Group Room System ---------- */
  // Create a room
  socket.on("create-room", () => {
    const roomId = uuidv4();
    socket.join(roomId);
    groupRooms.set(roomId, true);
    socket.emit("room-created", { roomId });
    console.log(`📦 Room created ${roomId} by ${socket.id}`);
  });

  // Join a room
  socket.on("join-room", ({ roomId }) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) {
      socket.emit("error", { message: "Room does not exist" });
      return;
    }
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", { userId: socket.id });
    socket.emit("room-joined", { roomId });
    console.log(`${socket.id} joined room ${roomId}`);
  });

  // Leave a room
  socket.on("leave-room", ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { userId: socket.id });
    console.log(`${socket.id} left room ${roomId}`);
  });

  /* ---------- Cleanup ---------- */
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);

    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
        socket.to(roomId).emit("user-left", { userId: socket.id });
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Combined signaling server running on port ${PORT}`);
});

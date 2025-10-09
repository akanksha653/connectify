// server/signaling.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://connectify-hub.vercel.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("🚀 Signaling server is running for 1-to-1 chat!");
});

let waitingUsers = [];

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // ---- USER STARTS LOOKING ----
  socket.on("start-looking", (userInfo) => {
    const {
      gender,
      country,
      age,
      name,
      filterGender = "",
      filterCountry = "",
    } = userInfo || {};

    socket.userData = { gender, country, age, name, filterGender, filterCountry };

    // Try to find compatible waiting user
    const index = waitingUsers.findIndex((other) => {
      if (!other.connected || !other.userData) return false;
      const my = socket.userData;
      const their = other.userData;

      const mutualFilterMatch =
        (!their.filterGender || their.filterGender === my.gender) &&
        (!their.filterCountry ||
          their.filterCountry.toLowerCase() === my.country?.toLowerCase()) &&
        (!my.filterGender || my.filterGender === their.gender) &&
        (!my.filterCountry ||
          my.filterCountry.toLowerCase() === their.country?.toLowerCase());

      return mutualFilterMatch;
    });

    if (index !== -1) {
      const partner = waitingUsers.splice(index, 1)[0];
      const roomId = uuidv4();

      socket.join(roomId);
      partner.join(roomId);

      // Notify both sides
      socket.emit("matched", {
        roomId,
        partnerId: partner.id,
        isOfferer: false,
        partnerName: partner.userData?.name || "Stranger",
        partnerAge: partner.userData?.age || "Unknown",
        partnerCountry: partner.userData?.country || "Unknown",
      });

      partner.emit("matched", {
        roomId,
        partnerId: socket.id,
        isOfferer: true,
        partnerName: socket.userData?.name || "Stranger",
        partnerAge: socket.userData?.age || "Unknown",
        partnerCountry: socket.userData?.country || "Unknown",
      });
    } else {
      waitingUsers.push(socket);
      socket.emit("waiting");
    }
  });

  // ---- CHAT MESSAGING ----
  socket.on("send-message", (msg) => {
    const { roomId, id: messageId } = msg;
    console.log(`💬 Message in ${roomId}:`, msg);

    // Send message to receiver
    socket.to(roomId).emit("receive-message", msg);

    // Immediately send 'delivered' to sender
    socket.emit("message-status-update", {
      messageId,
      status: "delivered",
    });
  });

  // Receiver confirms seen
  socket.on("seen-message", ({ roomId, messageId }) => {
    socket.to(roomId).emit("message-status-update", {
      messageId,
      status: "seen",
    });
  });

  // ---- EDIT MESSAGE ----
  socket.on("edit-message", ({ roomId, messageId, content }) => {
    socket.to(roomId).emit("message-edited", {
      id: messageId,
      content,
      edited: true,
    });
  });

  // ---- DELETE MESSAGE ----
  socket.on("delete-message", ({ roomId, messageId }) => {
    socket.to(roomId).emit("message-deleted", { messageId });
  });

  // ---- REACT TO MESSAGE ----
  socket.on("react-message", ({ roomId, messageId, reaction, user }) => {
    socket.to(roomId).emit("message-react", { messageId, reaction, user });
  });

  // ---- TYPING ----
  socket.on("typing", ({ roomId, sender }) => {
    socket.to(roomId).emit("typing", { sender });
  });

  // ---- LEAVE ROOM ----
  socket.on("leave-room", (roomId) => {
    console.log(`🚪 ${socket.id} left room ${roomId}`);
    socket.leave(roomId);
    socket.to(roomId).emit("partner-left", { partnerId: socket.id });
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
  });

  // ---- SKIP ----
  socket.on("skip", () => {
    console.log(`⏭️ ${socket.id} skipped current chat`);
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.leave(roomId);
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    socket.emit("start-looking", socket.userData);
  });

  // ---- DISCONNECT ----
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });
  });
});

// ---- START SERVER ----
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});

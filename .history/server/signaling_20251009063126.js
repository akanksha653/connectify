// server/signaling.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["https://connectify-hub.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("🚀 Signaling server is running for 1-to-1 chat!");
});

let waitingUsers = [];

/* -------------------------
   Helper functions
-------------------------- */
const removeFromWaiting = (socketId) => {
  waitingUsers = waitingUsers.filter((s) => s.id !== socketId);
};

const findPartner = (socket) => {
  const my = socket.userData;
  return waitingUsers.find((other) => {
    if (!other.connected || !other.userData || other.id === socket.id) return false;
    const their = other.userData;
    const mutualFilterMatch =
      (!their.filterGender || their.filterGender === my.gender) &&
      (!their.filterCountry || their.filterCountry.toLowerCase() === my.country?.toLowerCase()) &&
      (!my.filterGender || my.filterGender === their.gender) &&
      (!my.filterCountry || my.filterCountry.toLowerCase() === their.country?.toLowerCase());
    return mutualFilterMatch;
  });
};

/* -------------------------
   Socket events
-------------------------- */
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // ---- START LOOKING ----
  socket.on("start-looking", (userInfo) => {
    socket.userData = { ...userInfo };
    removeFromWaiting(socket.id); // remove previous instance if any

    const partner = findPartner(socket);

    if (partner) {
      const roomId = uuidv4();

      socket.join(roomId);
      partner.join(roomId);

      removeFromWaiting(partner.id); // remove matched partner

      // Notify both users
      socket.emit("matched", {
        roomId,
        partnerId: partner.id,
        isOfferer: false,
        partnerName: partner.userData.name || "Stranger",
        partnerAge: partner.userData.age || "Unknown",
        partnerCountry: partner.userData.country || "Unknown",
      });

      partner.emit("matched", {
        roomId,
        partnerId: socket.id,
        isOfferer: true,
        partnerName: socket.userData.name || "Stranger",
        partnerAge: socket.userData.age || "Unknown",
        partnerCountry: socket.userData.country || "Unknown",
      });
    } else {
      waitingUsers.push(socket);
      socket.emit("waiting");
    }
  });

  // ---- CHAT MESSAGES ----
  socket.on("send-message", (msg) => {
    const { roomId, id: messageId } = msg;
    if (!roomId) return;
    socket.to(roomId).emit("receive-message", msg);
    socket.emit("message-status-update", { messageId, status: "delivered" });
  });

  socket.on("seen-message", ({ roomId, messageId }) => {
    if (!roomId) return;
    socket.to(roomId).emit("message-status-update", { messageId, status: "seen" });
  });

  socket.on("edit-message", ({ roomId, messageId, content }) => {
    if (!roomId) return;
    socket.to(roomId).emit("message-edited", { id: messageId, content, edited: true });
  });

  socket.on("delete-message", ({ roomId, messageId }) => {
    if (!roomId) return;
    socket.to(roomId).emit("message-deleted", { messageId });
  });

  socket.on("react-message", ({ roomId, messageId, reaction, user }) => {
    if (!roomId) return;
    socket.to(roomId).emit("message-react", { roomId, messageId, reaction, user });
  });

  socket.on("typing", ({ roomId, sender }) => {
    if (!roomId) return;
    socket.to(roomId).emit("typing", { sender });
  });

  // ---- LEAVE ROOM ----
  socket.on("leave-room", (roomId) => {
    if (!roomId) return;
    socket.leave(roomId);
    socket.to(roomId).emit("partner-left", { partnerId: socket.id });
    removeFromWaiting(socket.id);
  });

  // ---- SKIP ----
  socket.on("skip", () => {
    // Leave all non-private rooms
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.leave(roomId);
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });
    removeFromWaiting(socket.id);
    // Restart searching
    socket.emit("start-looking", socket.userData);
  });

  // ---- DISCONNECT ----
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    removeFromWaiting(socket.id);
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      }
    });
  });
});

/* -------------------------
   START SERVER
-------------------------- */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});

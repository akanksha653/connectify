// server/signaling.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => res.send("🚀 Signaling server is running!"));

/* -------------------------
   In-memory waiting queue
------------------------- */
let waitingUsers = [];

/* -------------------------
   Socket connection
------------------------- */
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  /* -------------------------
     Start Looking / Matchmaking
  ------------------------- */
  socket.on("start-looking", (userInfo = {}) => {
    const { gender, country, age, name, filterGender = "", filterCountry = "" } = userInfo;
    socket.userData = { gender, country, age, name, filterGender, filterCountry };

    // Find a matching partner
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

      // Emit matched event
      partner.emit("matched", {
        roomId,
        partnerId: socket.id,
        isOfferer: true,
        partnerName: socket.userData?.name || "Stranger",
        partnerAge: socket.userData?.age || "Unknown",
        partnerCountry: socket.userData?.country || "Unknown",
      });

      socket.emit("matched", {
        roomId,
        partnerId: partner.id,
        isOfferer: false,
        partnerName: partner.userData?.name || "Stranger",
        partnerAge: partner.userData?.age || "Unknown",
        partnerCountry: partner.userData?.country || "Unknown",
      });
    } else {
      waitingUsers.push(socket);
    }
  });

  /* -------------------------
     Join / Leave Rooms
  ------------------------- */
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.emit("joined-room", roomId);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("partner-left", { partnerId: socket.id });
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
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

  /* -------------------------
     WebRTC Signaling
  ------------------------- */
  socket.on("offer", ({ offer, roomId }) => socket.to(roomId).emit("offer", { offer, sender: socket.id }));
  socket.on("answer", ({ answer, roomId }) => socket.to(roomId).emit("answer", { answer, sender: socket.id }));
  socket.on("ice-candidate", ({ candidate, roomId }) => socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id }));

  /* -------------------------
     Chat / Messaging
  ------------------------- */
  socket.on("send-message", (msg) => {
    const { roomId } = msg;
    console.log(`💬 Message in ${roomId}:`, msg);
    socket.to(roomId).emit("receive-message", msg);
  });

  socket.on("typing", ({ roomId, sender }) => socket.to(roomId).emit("typing", { sender }));

  socket.on("message-status", ({ roomId, messageId, status }) =>
    socket.to(roomId).emit("message-status-update", { messageId, status })
  );

  socket.on("edit-message", ({ roomId, messageId, content }) =>
    socket.to(roomId).emit("receive-message", { id: messageId, content, type: "text", edited: true })
  );

  socket.on("delete-message", ({ roomId, messageId }) => socket.to(roomId).emit("message-deleted", { messageId }));

  socket.on("react-message", ({ roomId, messageId, reaction, user }) =>
    socket.to(roomId).emit("message-react", { messageId, reaction, user })
  );

  /* -------------------------
     Disconnect
  ------------------------- */
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

/* -------------------------
   Start server
------------------------- */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Signaling server running on port ${PORT}`));

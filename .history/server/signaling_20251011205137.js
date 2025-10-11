// server/signaling.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const path = require("path");

// --------------------
// Firebase Admin Init
// --------------------
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const roomsCollection = db.collection("rooms");

// --------------------
const app = express();
const server = http.createServer(app);

// Allow origins for local dev + production (add yours if different)
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://connectify-hub.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.get("/", (req, res) => res.send("🚀 Signaling server is running!"));

// -------------------------
// 1-1 Anonymous Chat (unchanged)
// -------------------------
let waitingUsers = [];

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // -------------------------
  // Start Looking / Matchmaking
  // -------------------------
  socket.on("start-looking", (userInfo = {}) => {
    const { gender, country, age, name, filterGender = "", filterCountry = "" } = userInfo;
    socket.userData = { gender, country, age, name, filterGender, filterCountry };
    socket.partnerId = null;

    const index = waitingUsers.findIndex((other) => {
      if (!other.connected || !other.userData) return false;
      const my = socket.userData;
      const their = other.userData;

      const mutualMatch =
        (!their.filterGender || their.filterGender === my.gender) &&
        (!their.filterCountry || their.filterCountry.toLowerCase() === (my.country || "").toLowerCase()) &&
        (!my.filterGender || my.filterGender === their.gender) &&
        (!my.filterCountry || my.filterCountry.toLowerCase() === (their.country || "").toLowerCase());

      return mutualMatch;
    });

    if (index !== -1) {
      const partner = waitingUsers.splice(index, 1)[0];
      const roomId = uuidv4();

      socket.join(roomId);
      partner.join(roomId);

      socket.partnerId = partner.id;
      partner.partnerId = socket.id;

      partner.emit("matched", {
        roomId,
        partnerId: socket.id,
        isOfferer: true,
        partnerName: socket.userData?.name || "Stranger",
        partnerAge: socket.userData?.age || "",
        partnerCountry: socket.userData?.country || "",
      });

      socket.emit("matched", {
        roomId,
        partnerId: partner.id,
        isOfferer: false,
        partnerName: partner.userData?.name || "Stranger",
        partnerAge: partner.userData?.age || "",
        partnerCountry: partner.userData?.country || "",
      });

      console.log(`🤝 Matched ${socket.id} ↔ ${partner.id} in ${roomId}`);
    } else {
      waitingUsers.push(socket);
      console.log(`🕒 ${socket.id} waiting...`);
    }
  });

  socket.on("leave-room", (roomId) => {
    try {
      socket.leave(roomId);
      socket.to(roomId).emit("partner-left", { partnerId: socket.id });
      waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
      socket.partnerId = null;
    } catch (e) {
      console.warn("leave-room error:", e);
    }
  });

  socket.on("skip", () => {
    console.log(`⏭️ ${socket.id} skipped`);
    if (socket.partnerId) {
      const partnerSocket = io.sockets.sockets.get(socket.partnerId);
      if (partnerSocket) {
        partnerSocket.emit("partner-left", { partnerId: socket.id });
        partnerSocket.partnerId = null;
      }
    }
    socket.partnerId = null;
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);
    socket.emit("start-looking", socket.userData);
  });

  socket.on("join-room", (roomId) => {
    console.log(`📡 ${socket.id} joined WebRTC room ${roomId}`);
    socket.join(roomId);
    socket.emit("joined-room", roomId);
  });

  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
  });

  socket.on("send-message", (msg) => {
    const { roomId } = msg;
    socket.to(roomId).emit("receive-message", msg);
  });

  socket.on("typing", ({ roomId, sender }) => {
    socket.to(roomId).emit("typing", { sender });
  });

  socket.on("message-status", ({ roomId, messageId, status }) => {
    socket.to(roomId).emit("message-status-update", { messageId, status });
  });

  socket.on("edit-message", ({ roomId, messageId, content }) => {
    socket.to(roomId).emit("receive-message", {
      id: messageId,
      content,
      type: "text",
      edited: true,
    });
  });

  socket.on("delete-message", ({ roomId, messageId }) => {
    socket.to(roomId).emit("message-deleted", { messageId });
  });

  socket.on("react-message", ({ roomId, messageId, reaction, user }) => {
    socket.to(roomId).emit("message-react", { messageId, reaction, user });
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ User disconnected: ${socket.id} (${reason})`);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);

    if (socket.partnerId) {
      const partnerSocket = io.sockets.sockets.get(socket.partnerId);
      if (partnerSocket) {
        partnerSocket.emit("partner-left", { partnerId: socket.id });
        partnerSocket.partnerId = null;
      }
    }

    socket.partnerId = null;
  });
});

// -------------------------
// Room Chat Namespace (/rooms)
// -------------------------
app.get("/rooms", (req, res) => res.send("🟢 Room namespace alive")); // Warmup route for Render

const roomIO = io.of("/rooms");

// ✅ Namespace middleware to ensure proper CORS / upgrade
roomIO.use((socket, next) => {
  console.log("🌐 /rooms namespace handshake from", socket.handshake.headers.origin);
  next();
});

roomIO.on("connection", async (socket) => {
  console.log("✅ Room chat connected:", socket.id);

  socket.conn.on("upgrade", () => console.log(`🚀 Upgraded ${socket.id} to WebSocket`));

  socket.emit("connected", { status: "ok" });

  try {
    const snapshot = await roomsCollection.get();
    const rooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    socket.emit("rooms", rooms);
  } catch {
    socket.emit("rooms", []);
  }

  // --- Create Room ---
  socket.on("create-room", async (room) => {
    try {
      if (!room.name || !room.topic) return;
      const roomRef = await roomsCollection.add({
        name: room.name,
        topic: room.topic,
        description: room.description || "",
        hasPassword: !!room.password,
        password: room.password || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        users: [],
        messages: [],
      });

      const newRoom = { id: roomRef.id, ...room };
      socket.emit("room-created", newRoom);

      const updatedRoomsSnapshot = await roomsCollection.get();
      const updatedRooms = updatedRoomsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      roomIO.emit("rooms", updatedRooms);
      console.log(`🏠 Room created: ${room.name} (${roomRef.id})`);
    } catch (err) {
      console.error("Error creating room:", err);
      socket.emit("create-room-error", { message: "Failed to create room." });
    }
  });

  // --- Join Room ---
  socket.on("join-room", async ({ roomId, user }) => {
    try {
      const roomRef = roomsCollection.doc(roomId);
      const roomDoc = await roomRef.get();
      if (!roomDoc.exists) {
        socket.emit("join-error", { message: "Room not found" });
        return;
      }

      const users = Array.isArray(roomDoc.data()?.users) ? roomDoc.data().users : [];
      const updated = users.filter((u) => u.socketId !== socket.id);
      updated.push({ socketId: socket.id, userInfo: user });

      await roomRef.update({ users: updated });
      socket.join(roomId);

      socket.emit("room-users", updated);
      roomIO.to(roomId).emit("room-users", updated);
      socket.to(roomId).emit("user-joined", { socketId: socket.id, userInfo: user });
      console.log(`➡️ Socket ${socket.id} joined room ${roomId}`);
    } catch (err) {
      console.error("join-room error:", err);
    }
  });

  // --- Leave Room (fixed stuck issue) ---
  socket.on("leave-room", async ({ roomId }) => {
    try {
      socket.leave(roomId);

      const roomRef = roomsCollection.doc(roomId);
      const doc = await roomRef.get();
      if (!doc.exists) return;

      const users = (doc.data()?.users || []).filter((u) => u.socketId !== socket.id);
      await roomRef.update({ users });

      roomIO.to(roomId).emit("room-users", users);
      socket.to(roomId).emit("user-left", { userId: socket.id });

      console.log(`⬅️ Socket ${socket.id} left room ${roomId}`);
      socket.emit("room-left", { success: true });
    } catch (err) {
      console.error("leave-room error:", err);
      socket.emit("room-left", { success: false });
    }
  });

  // --- Messaging ---
  socket.on("send-message", async ({ roomId, message }) => {
    try {
      const ref = roomsCollection.doc(roomId);
      const doc = await ref.get();
      if (!doc.exists) return;
      const messages = Array.isArray(doc.data()?.messages) ? doc.data().messages : [];
      messages.push(message);
      await ref.update({ messages });
      socket.to(roomId).emit("receive-message", message);
    } catch (err) {
      console.error("send-message error:", err);
    }
  });

  socket.on("typing", ({ roomId, userId }) => {
    socket.to(roomId).emit("typing", { userId });
  });

  // --- Disconnect cleanup ---
  socket.on("disconnect", async (reason) => {
    console.log(`❌ Room socket disconnected: ${socket.id} (${reason})`);
    try {
      const snapshot = await roomsCollection.get();
      for (const doc of snapshot.docs) {
        const users = (doc.data()?.users || []).filter((u) => u.socketId !== socket.id);
        await roomsCollection.doc(doc.id).update({ users });
        roomIO.to(doc.id).emit("room-users", users);
        roomIO.to(doc.id).emit("user-left", { userId: socket.id });
      }
    } catch (err) {
      console.error("disconnect cleanup error:", err);
    }
  });
});

// -------------------------
// Start Server
// -------------------------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Signaling server running on port ${PORT}`));

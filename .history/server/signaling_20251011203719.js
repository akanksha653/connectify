// server/signaling.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const cors = require("cors");

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
// Express + CORS
// --------------------
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://connectify-hub.vercel.app",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

// --------------------
// HTTP Routes
// --------------------
app.get("/", (req, res) => res.send("🚀 Signaling server is running!"));

// ✅ Warmup route for Render free tier
app.get("/warmup", (req, res) => {
  console.log("🔥 Warmup ping received");
  res.send("💤 Waking up server...");
});

app.get("/rooms", (req, res) => res.send("🟢 Room namespace alive"));

// --------------------
// HTTP + Socket.IO Server
// --------------------
const server = http.createServer(app);

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

// --------------------
// 1-1 Anonymous Chat (UNCHANGED)
// --------------------
let waitingUsers = [];

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // 1-1 logic (start-looking, leave-room, skip, join-room, offer/answer/ice, messaging)
  // Keep your existing 1-1 handlers here unchanged
  require("./handlers/oneToOneHandlers")(io, socket, waitingUsers); // optional: extract for clarity
});

// --------------------
// Room Chat Namespace (/rooms)
// --------------------
const roomIO = io.of("/rooms");

// ✅ Namespace middleware for logging CORS origin
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

      await roomRef.update({ users });
      socket.join(roomId);

      socket.emit("room-users", updated);
      roomIO.to(roomId).emit("room-users", updated);
      socket.to(roomId).emit("user-joined", { socketId: socket.id, userInfo: user });
      console.log(`➡️ Socket ${socket.id} joined room ${roomId}`);
    } catch (err) {
      console.error("join-room error:", err);
    }
  });

  // --- Leave Room ---
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

// --------------------
// Start Server
// --------------------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Signaling server running on port ${PORT}`));

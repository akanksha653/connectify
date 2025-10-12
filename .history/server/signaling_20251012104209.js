// server/signaling.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const cors = require("cors");

// --------------------
// Environment / Origins
// --------------------
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://connectify-hub.vercel.app";
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  FRONTEND_URL,
  // add more if needed
];

// --------------------
// Firebase Admin Init (safe)
// --------------------
let db = null;
let roomsCollection = null;

try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  db = admin.firestore();
  roomsCollection = db.collection("rooms");
  console.log("✅ Firebase Admin initialized");
} catch (err) {
  console.error("⚠️ Firebase Admin init failed — rooms functionality will be limited.", err.message);
  // We do not throw here so server can still start for 1-1 features.
}

// --------------------
// Express + CORS + JSON
// --------------------
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error("CORS not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  })
);

// Health & useful endpoints
app.get("/", (req, res) => res.send("🚀 Signaling server is running!"));
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: Date.now() }));

// Provide a simple JSON rooms endpoint (useful for debug / pings)
app.get("/rooms", async (req, res) => {
  if (!roomsCollection) {
    return res.status(503).json({ error: "Rooms DB not available" });
  }
  try {
    const snapshot = await roomsCollection.get();
    const rooms = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms via /rooms HTTP:", err);
    return res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// --------------------
// HTTP + Socket.IO Server
// --------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Path left as default; you can change with `path` option if needed
});

// -------------------------
// 1-1 Anonymous Chat (UNCHANGED)
// -------------------------
// Keep your 1-1 logic exactly as you had it. No changes here.
// (This block was preserved from your original file)
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
const roomIO = io.of("/rooms");

roomIO.use((socket, next) => {
  // log origin for debugging; don't block - CORS is handled by socket.io config
  console.log("🌐 /rooms namespace handshake from", socket.handshake.headers.origin);
  return next();
});

roomIO.on("connection", async (socket) => {
  console.log("✅ Room chat connected:", socket.id);

  socket.conn.on("upgrade", () => console.log(`🚀 Upgraded ${socket.id} to WebSocket`));
  socket.emit("connected", { status: "ok" });

  // on new connection, send full rooms list (if DB available)
  if (roomsCollection) {
    try {
      const snapshot = await roomsCollection.get();
      const rooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      socket.emit("rooms", rooms);
    } catch (err) {
      console.error("Error fetching rooms for new socket:", err);
      socket.emit("rooms", []);
    }
  } else {
    socket.emit("rooms", []);
  }

  // ---------- create room ----------
  socket.on("create-room", async (room) => {
    if (!roomsCollection) {
      socket.emit("create-room-error", { message: "Rooms DB not configured" });
      return;
    }
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

      const newRoom = { id: roomRef.id, name: room.name, topic: room.topic, description: room.description || "", hasPassword: !!room.password };
      socket.emit("room-created", newRoom);

      // broadcast updated rooms list
      const updatedSnapshot = await roomsCollection.get();
      const updatedRooms = updatedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      roomIO.emit("rooms", updatedRooms);
      console.log(`🏠 Room created: ${room.name} (${roomRef.id})`);
    } catch (err) {
      console.error("Error creating room:", err);
      socket.emit("create-room-error", { message: "Failed to create room." });
    }
  });

  // ---------- join room ----------
  socket.on("join-room", async ({ roomId, user }) => {
    if (!roomsCollection) return socket.emit("join-error", { message: "Rooms DB not configured" });
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

      // emit user lists & update rooms to all listeners
      socket.emit("room-users", updated);
      roomIO.to(roomId).emit("room-users", updated);

      // broadcast latest rooms list
      const updatedSnapshot = await roomsCollection.get();
      const updatedRooms = updatedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      roomIO.emit("rooms", updatedRooms);

      socket.to(roomId).emit("user-joined", { socketId: socket.id, userInfo: user });
      console.log(`➡️ Socket ${socket.id} joined room ${roomId}`);
    } catch (err) {
      console.error("join-room error:", err);
    }
  });

  // ---------- leave room ----------
  socket.on("leave-room", async ({ roomId }) => {
    if (!roomsCollection) return socket.emit("room-left", { success: false, message: "Rooms DB not configured" });
    try {
      socket.leave(roomId);

      const roomRef = roomsCollection.doc(roomId);
      const doc = await roomRef.get();
      if (!doc.exists) return;

      const users = (doc.data()?.users || []).filter((u) => u.socketId !== socket.id);
      await roomRef.update({ users });

      roomIO.to(roomId).emit("room-users", users);
      socket.to(roomId).emit("user-left", { userId: socket.id });

      // broadcast latest rooms list
      const updatedSnapshot = await roomsCollection.get();
      const updatedRooms = updatedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      roomIO.emit("rooms", updatedRooms);

      console.log(`⬅️ Socket ${socket.id} left room ${roomId}`);
      socket.emit("room-left", { success: true });
    } catch (err) {
      console.error("leave-room error:", err);
      socket.emit("room-left", { success: false });
    }
  });

  // ---------- delete room ----------
  socket.on("delete-room", async ({ roomId }) => {
    if (!roomsCollection) return socket.emit("delete-room-error", { message: "Rooms DB not configured" });
    try {
      const roomRef = roomsCollection.doc(roomId);
      const doc = await roomRef.get();
      if (!doc.exists) {
        socket.emit("delete-room-error", { message: "Room not found" });
        return;
      }

      // Optionally: check permissions here (creator id, owner etc.)
      await roomRef.delete();

      // Broadcast updated rooms list
      const updatedSnapshot = await roomsCollection.get();
      const updatedRooms = updatedSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      roomIO.emit("rooms", updatedRooms);

      // Notify clients in that room & force them to leave (if connected)
      roomIO.to(roomId).emit("room-deleted", { roomId });
      roomIO.in(roomId).socketsLeave(roomId);

      console.log(`🗑️ Room deleted: ${roomId}`);
      socket.emit("delete-room-success", { roomId });
    } catch (err) {
      console.error("delete-room error:", err);
      socket.emit("delete-room-error", { message: "Failed to delete room" });
    }
  });

  // ---------- messaging ----------
  socket.on("send-message", async ({ roomId, message }) => {
    if (!roomsCollection) return;
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

  // ---------- disconnect cleanup ----------
  socket.on("disconnect", async (reason) => {
    console.log(`❌ Room socket disconnected: ${socket.id} (${reason})`);
    if (!roomsCollection) return;
    try {
      const snapshot = await roomsCollection.get();
      let broadcastRooms = false;
      for (const doc of snapshot.docs) {
        const roomId = doc.id;
        const users = (doc.data()?.users || []).filter((u) => u.socketId !== socket.id);
        if (users.length !== (doc.data()?.users || []).length) {
          await roomsCollection.doc(roomId).update({ users });
          roomIO.to(roomId).emit("room-users", users);
          roomIO.to(roomId).emit("user-left", { userId: socket.id });
          broadcastRooms = true;
        }
      }
      if (broadcastRooms) {
        const updatedSnapshot = await roomsCollection.get();
        const updatedRooms = updatedSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        roomIO.emit("rooms", updatedRooms);
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

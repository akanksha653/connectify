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
// Make sure firebase-service-key.json exists in server/ (not committed to git).
const serviceAccountPath = path.join(__dirname, "firebase-service-key.json");
const serviceAccount = require(serviceAccountPath);

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
// 1-1 Anonymous Chat
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

    // find compatible partner
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

  // -------------------------
  // Leave / Skip / End
  // -------------------------
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
    // restart searching
    socket.emit("start-looking", socket.userData);
  });

  // -------------------------
  // WebRTC Signaling for 1-1
  // -------------------------
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

  // -------------------------
  // Chat / Messaging for 1-1
  // -------------------------
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

  // -------------------------
  // Disconnect / Cleanup for 1-1
  // -------------------------
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

roomIO.on("connection", async (socket) => {
  console.log("✅ Room chat connected:", socket.id);

  // send existing rooms (read from Firestore)
  try {
    const snapshot = await roomsCollection.get();
    const rooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    socket.emit("rooms", rooms);
  } catch (err) {
    console.error("Error fetching rooms from Firestore:", err);
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

      const newRoom = { id: roomRef.id, name: room.name, topic: room.topic, description: room.description || "", hasPassword: !!room.password, password: room.password || null, users: [], messages: [] };

      // notify creator
      socket.emit("room-created", newRoom);

      // broadcast updated rooms list
      const updatedRoomsSnapshot = await roomsCollection.get();
      const updatedRooms = updatedRoomsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      roomIO.emit("rooms", updatedRooms);
      console.log(`🏠 Room created: ${room.name} (${roomRef.id})`);
    } catch (err) {
      console.error("Error creating room:", err);
      socket.emit("create-room-error", { message: "Failed to create room." });
    }
  });

  // --- List Rooms ---
  socket.on("list-rooms", async () => {
    try {
      const snapshot = await roomsCollection.get();
      const rooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      socket.emit("rooms", rooms);
    } catch (err) {
      console.error("Error listing rooms:", err);
      socket.emit("rooms", []);
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

      const roomData = roomDoc.data() || {};
      const users = Array.isArray(roomData.users) ? roomData.users : [];
      // Avoid duplicate entries for same socket
      const filtered = users.filter((u) => u.socketId !== socket.id);
      filtered.push({ socketId: socket.id, userInfo: user });
      await roomRef.update({ users: filtered });

      socket.join(roomId);

      // Emit updated rooms list to all listeners
      const updatedRoomsSnapshot = await roomsCollection.get();
      const updatedRooms = updatedRoomsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      roomIO.emit("rooms", updatedRooms);

      // Emit the room-users list for clients to sync users (preferred)
      socket.emit("room-users", filtered);
      roomIO.to(roomId).emit("room-users", filtered);

      // Notify others in that room that a user joined (with socketId)
      socket.to(roomId).emit("user-joined", { socketId: socket.id, userInfo: user });

      console.log(`➡️ Socket ${socket.id} joined room ${roomId}`);
    } catch (err) {
      console.error("join-room error:", err);
    }
  });

  // --- Send Message ---
  socket.on("send-message", async ({ roomId, message }) => {
    try {
      const roomRef = roomsCollection.doc(roomId);
      const roomDoc = await roomRef.get();
      if (!roomDoc.exists) return;

      const messages = Array.isArray(roomDoc.data()?.messages) ? roomDoc.data().messages : [];
      messages.push(message);
      await roomRef.update({ messages });

      socket.to(roomId).emit("receive-message", message);
    } catch (err) {
      console.error("send-message error:", err);
    }
  });

  // --- Typing ---
  socket.on("typing", ({ roomId, userId }) => {
    socket.to(roomId).emit("typing", { userId });
  });

  // --- Leave Room ---
  socket.on("leave-room", async ({ roomId, userId }) => {
    try {
      const roomRef = roomsCollection.doc(roomId);
      const roomDoc = await roomRef.get();
      if (!roomDoc.exists) return;

      let users = Array.isArray(roomDoc.data()?.users) ? roomDoc.data().users : [];
      users = users.filter((u) => u.socketId !== socket.id);
      await roomRef.update({ users });

      // Emit updated rooms list & room-users
      const updatedRoomsSnapshot = await roomsCollection.get();
      const updatedRooms = updatedRoomsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      roomIO.emit("rooms", updatedRooms);
      roomIO.to(roomId).emit("room-users", users);

      socket.to(roomId).emit("user-left", { userId: socket.id });
      socket.leave(roomId);
      console.log(`⬅️ Socket ${socket.id} left room ${roomId}`);
    } catch (err) {
      console.error("leave-room error:", err);
    }
  });

  // --- Disconnect ---
  socket.on("disconnect", async (reason) => {
    console.log(`❌ Room socket disconnected: ${socket.id} (${reason})`);

    try {
      const snapshot = await roomsCollection.get();
      let broadcastRooms = false;

      for (const doc of snapshot.docs) {
        const docId = doc.id;
        let users = Array.isArray(doc.data()?.users) ? doc.data().users : [];
        const beforeCount = users.length;
        users = users.filter((u) => u.socketId !== socket.id);
        if (users.length !== beforeCount) {
          await roomsCollection.doc(docId).update({ users });
          // notify members in the room
          roomIO.to(docId).emit("user-left", { userId: socket.id });
          roomIO.to(docId).emit("room-users", users);
          broadcastRooms = true;
        }
      }

      if (broadcastRooms) {
        const updatedRoomsSnapshot = await roomsCollection.get();
        const updatedRooms = updatedRoomsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

// server/signaling.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");

// --------------------
// Firebase Admin Init
// --------------------
const serviceAccount = require("./firebase-service-key.json"); // your service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
const roomsCollection = db.collection("rooms");

// --------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://connectify-hub.vercel.app",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => res.send("🚀 Signaling server is running!"));

// -------------------------
// 1-1 Anonymous Chat (untouched)
// -------------------------
let waitingUsers = [];
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

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
      socket.partnerId = partner.id;
      partner.partnerId = socket.id;

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

      console.log(`🤝 Matched ${socket.id} ↔ ${partner.id} in ${roomId}`);
    } else {
      waitingUsers.push(socket);
      console.log(`🕒 ${socket.id} waiting...`);
    }
  });

  // ... all other 1-1 handlers remain untouched ...
});

// -------------------------
// Room Chat Namespace (/rooms)
// -------------------------
const roomIO = io.of("/rooms");

roomIO.on("connection", async (socket) => {
  console.log("✅ Room chat connected:", socket.id);

  // Send existing rooms from Firestore
  const snapshot = await roomsCollection.get();
  const rooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  socket.emit("rooms", rooms);

  // --- Create Room ---
  socket.on("create-room", async (room) => {
    if (!room.name || !room.topic) return;
    const roomRef = await roomsCollection.add({
      name: room.name,
      topic: room.topic,
      description: room.description || "",
      hasPassword: !!room.password,
      password: room.password || null,
      createdAt: new Date(),
      users: [],
    });

    const newRoom = { id: roomRef.id, ...room, users: [] };
    socket.emit("room-created", newRoom);

    // Broadcast to all clients
    const updatedRoomsSnapshot = await roomsCollection.get();
    const updatedRooms = updatedRoomsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    roomIO.emit("rooms", updatedRooms);
    console.log(`🏠 Room created: ${room.name} (${roomRef.id})`);
  });

  // --- Join Room ---
  socket.on("join-room", async ({ roomId, user }) => {
    const roomRef = roomsCollection.doc(roomId);
    const roomDoc = await roomRef.get();
    if (!roomDoc.exists) return;

    const roomData = roomDoc.data();
    const users = roomData?.users || [];
    users.push({ socketId: socket.id, ...user });
    await roomRef.update({ users });

    socket.join(roomId);
    socket.to(roomId).emit("user-joined", user);
  });

  // --- Send Message ---
  socket.on("send-message", async ({ roomId, message }) => {
    const roomRef = roomsCollection.doc(roomId);
    const roomDoc = await roomRef.get();
    if (!roomDoc.exists) return;

    const messages = roomDoc.data()?.messages || [];
    messages.push(message);
    await roomRef.update({ messages });

    socket.to(roomId).emit("receive-message", message);
  });

  // --- Typing ---
  socket.on("typing", ({ roomId, userId }) => {
    socket.to(roomId).emit("typing", { userId });
  });

  // --- Leave Room ---
  socket.on("leave-room", async ({ roomId, userId }) => {
    const roomRef = roomsCollection.doc(roomId);
    const roomDoc = await roomRef.get();
    if (!roomDoc.exists) return;

    let users = roomDoc.data()?.users || [];
    users = users.filter((u) => u.socketId !== socket.id);
    await roomRef.update({ users });

    socket.to(roomId).emit("user-left", { userId });
    socket.leave(roomId);
  });

  // --- Disconnect ---
  socket.on("disconnect", async () => {
    const snapshot = await roomsCollection.get();
    for (const doc of snapshot.docs) {
      let users = doc.data()?.users || [];
      users = users.filter((u) => u.socketId !== socket.id);
      await roomsCollection.doc(doc.id).update({ users });
      socket.to(doc.id).emit("user-left", { userId: socket.id });
    }
  });
});

// -------------------------
// Start Server
// -------------------------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Signaling server running on port ${PORT}`));

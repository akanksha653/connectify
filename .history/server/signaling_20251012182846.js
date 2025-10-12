// -------------------------
// Room Chat Namespace (/rooms) - IMPROVED
// -------------------------
const roomIO = io.of("/rooms");

roomIO.use((socket, next) => {
  console.log("🌐 /rooms namespace handshake from", socket.handshake.headers.origin);
  return next();
});

roomIO.on("connection", async (socket) => {
  console.log("✅ Room chat connected:", socket.id);

  socket.emit("connected", { status: "ok" });

  // Fetch all rooms on connect
  const emitRooms = async () => {
    if (!roomsCollection) return socket.emit("rooms", []);
    try {
      const snapshot = await roomsCollection.get();
      const rooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      roomIO.emit("rooms", rooms);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      socket.emit("rooms", []);
    }
  };

  await emitRooms();

  // ---------- create room ----------
  socket.on("create-room", async (room) => {
    if (!roomsCollection) return socket.emit("create-room-error", { message: "Rooms DB not configured" });

    try {
      if (!room.name || !room.topic) {
        return socket.emit("create-room-error", { message: "Room name and topic are required" });
      }

      const roomRef = await roomsCollection.add({
        name: room.name,
        topic: room.topic,
        description: room.description || "",
        hasPassword: !!room.password,
        password: room.password || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        users: [],
      });

      const newRoom = {
        id: roomRef.id,
        name: room.name,
        topic: room.topic,
        description: room.description || "",
        hasPassword: !!room.password,
      };

      socket.emit("room-created", newRoom);
      console.log(`🏠 Room created: ${room.name} (${roomRef.id})`);

      await emitRooms();
    } catch (err) {
      console.error("create-room error:", err);
      socket.emit("create-room-error", { message: "Failed to create room" });
    }
  });

  // ---------- join room ----------
  socket.on("join-room", async ({ roomId, user }) => {
    if (!roomsCollection) return socket.emit("join-error", { message: "Rooms DB not configured" });

    try {
      const roomRef = roomsCollection.doc(roomId);
      const roomDoc = await roomRef.get();

      if (!roomDoc.exists) return socket.emit("join-error", { message: "Room not found" });

      let users = Array.isArray(roomDoc.data()?.users) ? roomDoc.data().users : [];
      users = users.filter((u) => u.socketId !== socket.id); // Remove duplicate
      users.push({ socketId: socket.id, userInfo: user });

      await roomRef.update({ users });
      socket.join(roomId);

      socket.emit("room-users", users);
      roomIO.to(roomId).emit("room-users", users);
      socket.to(roomId).emit("user-joined", { socketId: socket.id, userInfo: user });

      console.log(`➡️ Socket ${socket.id} joined room ${roomId}`);
      await emitRooms();
    } catch (err) {
      console.error("join-room error:", err);
      socket.emit("join-error", { message: "Failed to join room" });
    }
  });

  // ---------- leave room ----------
  socket.on("leave-room", async ({ roomId }) => {
    if (!roomsCollection) return socket.emit("room-left", { success: false, message: "Rooms DB not configured" });

    try {
      socket.leave(roomId);

      const roomRef = roomsCollection.doc(roomId);
      const roomDoc = await roomRef.get();
      if (!roomDoc.exists) return;

      let users = roomDoc.data()?.users || [];
      users = users.filter((u) => u.socketId !== socket.id);
      await roomRef.update({ users });

      roomIO.to(roomId).emit("room-users", users);
      socket.to(roomId).emit("user-left", { userId: socket.id });

      console.log(`⬅️ Socket ${socket.id} left room ${roomId}`);
      socket.emit("room-left", { success: true });

      await emitRooms();
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
      const roomDoc = await roomRef.get();

      if (!roomDoc.exists) return socket.emit("delete-room-error", { message: "Room not found" });

      await roomRef.delete();
      roomIO.to(roomId).emit("room-deleted", { roomId });
      roomIO.in(roomId).socketsLeave(roomId);

      console.log(`🗑️ Room deleted: ${roomId}`);
      socket.emit("delete-room-success", { roomId });

      await emitRooms();
    } catch (err) {
      console.error("delete-room error:", err);
      socket.emit("delete-room-error", { message: "Failed to delete room" });
    }
  });

  // ---------- send / load messages ----------
  socket.on("send-message", async ({ roomId, message }) => {
    if (!roomsCollection || !roomId || !message?.text) return;

    try {
      const roomRef = roomsCollection.doc(roomId);
      const messagesRef = roomRef.collection("messages");

      const newMessageRef = messagesRef.doc();
      const messageData = { id: newMessageRef.id, ...message, createdAt: new Date() };
      await newMessageRef.set(messageData);

      roomIO.to(roomId).emit("receive-message", messageData);
    } catch (err) {
      console.error("send-message error:", err);
    }
  });

  socket.on("load-messages", async ({ roomId, limit = 50, lastMessageId = null }) => {
    if (!roomsCollection) return;

    try {
      const messagesRef = roomsCollection.doc(roomId).collection("messages");
      let query = messagesRef.orderBy("createdAt", "desc").limit(limit);

      if (lastMessageId) {
        const lastDoc = await messagesRef.doc(lastMessageId).get();
        if (lastDoc.exists) query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      socket.emit("messages", messages.reverse());
    } catch (err) {
      console.error("load-messages error:", err);
    }
  });

  // ---------- typing events ----------
  socket.on("typing", ({ roomId, userId }) => socket.to(roomId).emit("typing", { userId }));
  socket.on("stop-typing", ({ roomId, userId }) => socket.to(roomId).emit("stop-typing", { userId }));

  // ---------- disconnect cleanup ----------
  socket.on("disconnect", async (reason) => {
    console.log(`❌ Room socket disconnected: ${socket.id} (${reason})`);
    if (!roomsCollection) return;

    try {
      const snapshot = await roomsCollection.get();
      let broadcastRooms = false;

      for (const doc of snapshot.docs) {
        const roomId = doc.id;
        let users = (doc.data()?.users || []).filter((u) => u.socketId !== socket.id);
        if (users.length !== (doc.data()?.users || []).length) {
          await roomsCollection.doc(roomId).update({ users });
          roomIO.to(roomId).emit("room-users", users);
          roomIO.to(roomId).emit("user-left", { userId: socket.id });
          broadcastRooms = true;
        }
      }

      if (broadcastRooms) await emitRooms();
    } catch (err) {
      console.error("disconnect cleanup error:", err);
    }
  });
});

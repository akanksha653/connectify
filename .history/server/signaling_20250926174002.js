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

app.get("/", (_, res) => res.send("🚀 Signaling server is running!"));

// ------------------ EXISTING 1-to-1 MATCH SYSTEM ------------------
let waitingUsers = [];

// ------------------ NEW ROOM SYSTEM STORAGE ------------------
/*
rooms = {
  roomId: {
    name, topic, description, password,
    users: Map<socketId,{id,name}>
  }
}
*/
let rooms = {};

// ------------------ SOCKET LOGIC ------------------
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // ---------- 1-to-1 Anonymous Chat ----------
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

    const index = waitingUsers.findIndex((other) => {
      if (!other.connected || !other.userData) return false;

      const my = socket.userData;
      const their = other.userData;

      const mutualFilterMatch =
        (!their.filterGender || their.filterGender === my.gender) &&
        (!their.filterCountry || their.filterCountry.toLowerCase() === my.country?.toLowerCase()) &&
        (!my.filterGender || my.filterGender === their.gender) &&
        (!my.filterCountry || my.filterCountry.toLowerCase() === their.country?.toLowerCase());

      return mutualFilterMatch;
    });

    if (index !== -1) {
      const partner = waitingUsers.splice(index, 1)[0];
      const roomId = uuidv4();

      socket.join(roomId);
      partner.join(roomId);

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

  // ---------- WebRTC signaling (shared) ----------
  socket.on("offer", ({ offer, roomId }) =>
    socket.to(roomId).emit("offer", { offer, sender: socket.id })
  );
  socket.on("answer", ({ answer, roomId }) =>
    socket.to(roomId).emit("answer", { answer, sender: socket.id })
  );
  socket.on("ice-candidate", ({ candidate, roomId }) =>
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id })
  );

  // ---------- Chat events (shared) ----------
  socket.on("send-message", (msg) => {
    const { roomId } = msg;
    socket.to(roomId).emit("receive-message", msg);
  });
  socket.on("typing", ({ roomId, sender }) =>
    socket.to(roomId).emit("typing", { sender })
  );
  socket.on("message-status", ({ roomId, messageId, status }) =>
    socket.to(roomId).emit("message-status-update", { messageId, status })
  );
  socket.on("edit-message", ({ roomId, messageId, content }) =>
    socket.to(roomId).emit("receive-message", {
      id: messageId,
      content,
      type: "text",
      edited: true,
    })
  );
  socket.on("delete-message", ({ roomId, messageId }) =>
    socket.to(roomId).emit("message-deleted", { messageId })
  );
  socket.on("react-message", ({ roomId, messageId, reaction, user }) =>
    socket.to(roomId).emit("message-react", { messageId, reaction, user })
  );

  // ---------- NEW Group Room System ----------
  const broadcastRoomList = () => {
    const list = Object.entries(rooms).map(([id, r]) => ({
      id,
      name: r.name,
      topic: r.topic,
      description: r.description,
      count: r.users.size,
      locked: !!r.password,
    }));
    io.emit("rooms-list", list);
  };

  socket.on("create-room", ({ name, topic, description, password, userName }) => {
    const roomId = uuidv4();
    rooms[roomId] = {
      name,
      topic,
      description,
      password: password || null,
      users: new Map(),
    };
    // auto join creator
    rooms[roomId].users.set(socket.id, { id: socket.id, name: userName || "Anonymous" });
    socket.join(roomId);
    socket.emit("room-created", { roomId });
    io.to(roomId).emit("room-users", [...rooms[roomId].users.values()]);
    broadcastRoomList();
  });

  socket.on("join-room", ({ roomId, password, userName }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("join-error", "Room not found");
    if (room.password && room.password !== password)
      return socket.emit("join-error", "Incorrect password");

    room.users.set(socket.id, { id: socket.id, name: userName || "Anonymous" });
    socket.join(roomId);
    socket.emit("joined-room", { roomId, room });
    io.to(roomId).emit("room-users", [...room.users.values()]);
    broadcastRoomList();
  });

  socket.on("leave-room", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.users.delete(socket.id);
    socket.leave(roomId);
    io.to(roomId).emit("room-users", [...room.users.values()]);
    if (room.users.size === 0) delete rooms[roomId];
    broadcastRoomList();
  });

  // ---------- Disconnect ----------
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);

    // clean up group rooms
    for (const [rid, room] of Object.entries(rooms)) {
      if (room.users.delete(socket.id)) {
        io.to(rid).emit("room-users", [...room.users.values()]);
        if (room.users.size === 0) delete rooms[rid];
      }
    }

    socket.rooms.forEach((rid) => {
      if (rid !== socket.id) {
        socket.to(rid).emit("partner-left", { partnerId: socket.id });
      }
    });
    broadcastRoomList();
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`🚀 Signaling server running on port ${PORT}`)
);

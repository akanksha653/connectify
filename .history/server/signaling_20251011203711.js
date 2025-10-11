import { io } from "socket.io-client";

function createSocket(namespace = "") {
  const url = "https://connectify-z9gv.onrender.com" + namespace;
  const socket = io(url, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => console.log("✅ Connected:", socket.id));
  socket.on("connect_error", (err) => console.warn("⚠️ Connect error:", err.message));
  socket.on("disconnect", (reason) => console.log("❌ Disconnected:", reason));

  return socket;
}

// Usage
const mainSocket = createSocket();        // 1-1 namespace
const roomsSocket = createSocket("/rooms"); // /rooms namespace

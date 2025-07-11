import { createServer } from "http";
import { Server } from "socket.io";
import signaling from "./signaling";

const PORT = process.env.PORT || 3001;

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Replace with your frontend URL in production
    methods: ["GET", "POST"],
  },
});

// Initialize signaling handlers
signaling(io);

httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});

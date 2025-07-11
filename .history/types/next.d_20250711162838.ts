import { Server as HTTPServer } from "http";
import { Server as IOServer } from "socket.io";

export type NextApiResponseServerIO = {
  socket: {
    server: HTTPServer & {
      io?: IOServer;
    };
  };
};

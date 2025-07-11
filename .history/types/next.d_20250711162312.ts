import { Server as HTTPServer } from "http";
import { Socket as IOSocket, Server as IOServer } from "socket.io";
import { NextApiResponse } from "next";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: IOSocket & {
    server: HTTPServer & {
      io: IOServer;
    };
  };
};

import type { NextApiResponse } from "next";

/**
 * Extends NextApiResponse to include socket.io server instance
 */
export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: {
      io?: any;
    };
  };
};

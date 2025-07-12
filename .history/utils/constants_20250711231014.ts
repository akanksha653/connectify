export const APP_NAME = "MyOmegleClone";

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL;

export const ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
  {
    urls: "turn:your.turn.server:3478",
    username: "username",
    credential: "password",
  },
];

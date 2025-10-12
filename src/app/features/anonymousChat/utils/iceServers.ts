// features/anonymousChat/utils/iceServers.ts

export const iceServers: RTCIceServer[] = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
  {
    urls: "stun:stun1.l.google.com:19302",
  },
  {
    urls: "turn:your.turnserver.com:3478",
    username: "yourUsername",
    credential: "yourCredential",
  },
];

export default iceServers;

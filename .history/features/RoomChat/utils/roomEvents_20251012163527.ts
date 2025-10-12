// features/RoomSystem/utils/roomEvents.ts

// Socket Event Constants
export const ROOM_EVENTS = {
  CREATE: "create-room",
  CREATED: "room-created",
  JOIN: "join-room",
  JOINED: "room-joined",
  LEAVE: "leave-room",
  LEFT: "room-left",
  DELETE: "delete-room",
  DELETED: "room-deleted",

  USERS: "room-users",
  MESSAGE_SEND: "send-message",
  MESSAGE_RECEIVE: "receive-message",
  TYPING: "typing",

  // WebRTC
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
};

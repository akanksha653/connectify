// features/RoomSystem/utils/roomTypes.ts

export interface Room {
  id: string;
  name: string;
  topic?: string;
  description?: string;
  hasPassword?: boolean;
  password?: string | null;
  createdAt?: string;
  users?: Participant[];
}

export interface Participant {
  socketId: string;
  userInfo: {
    name: string;
    country: string;
    age: number | string;
  };
  stream?: MediaStream;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "emoji" | "file" | "image" | "audio" | "video";
  timestamp: number;
  status?: "sent" | "delivered" | "seen";
  reactions?: { [emoji: string]: string[] };
  fileUrl?: string;
}

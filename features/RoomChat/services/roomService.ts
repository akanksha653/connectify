// features/RoomSystem/services/roomService.ts
import axios from "axios";
import type { Room } from "../utils/roomTypes";

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

export async function fetchRooms() {
  const res = await axios.get(`${SIGNALING_URL}/rooms`);
  return res.data as Room[];
}

// Optional: create via REST if you prefer server-side creation
export async function createRoomRest(payload: { name: string; topic: string; description?: string; password?: string }) {
  const res = await axios.post(`${SIGNALING_URL}/rooms`, payload);
  return res.data;
}

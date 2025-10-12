// features/RoomChat/services/roomService.ts
import { collection, getDocs, addDoc, getFirestore, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig"; // make sure Firebase is initialized

import type { Room } from "../utils/roomTypes";

// Fetch rooms from Firebase Firestore
export async function fetchRooms(): Promise<Room[]> {
  try {
    const roomsCol = collection(db, "rooms");
    const snapshot = await getDocs(roomsCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
  } catch (err) {
    console.error("Error fetching rooms:", err);
    return [];
  }
}

// Create room directly in Firebase
export async function createRoomFirebase(payload: {
  name: string;
  topic: string;
  description?: string;
  password?: string;
}): Promise<Room | null> {
  try {
    const docRef = await addDoc(collection(db, "rooms"), {
      name: payload.name,
      topic: payload.topic,
      description: payload.description || "",
      hasPassword: !!payload.password,
      password: payload.password || null,
      users: [],
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      name: payload.name,
      topic: payload.topic,
      description: payload.description || "",
      hasPassword: !!payload.password,
      users: [],
    } as Room;
  } catch (err) {
    console.error("Error creating room:", err);
    return null;
  }
}

// src/app/auth/firebaseAuth.ts
import { auth, database } from "@/lib/firebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";

interface UserData {
  name: string;
  age: number;
  gender: string;
  country: string;
  currentStatus?: string;
  lastSeen?: number;
}

// ------------------ Register New User ------------------
export async function registerUser(email: string, password: string, userData: UserData) {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Save user info in Realtime Database
    await set(ref(database, `users/${userId}`), {
      uid: userId,
      email,
      ...userData,
      currentStatus: "idle",
      lastSeen: Date.now(),
    });

    return userId;
  } catch (err: any) {
    console.error("Register Error:", err);
    throw new Error(err.message || "Failed to register user");
  }
}

// ------------------ Login Existing User ------------------
export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user.uid;
  } catch (err: any) {
    console.error("Login Error:", err);
    throw new Error(err.message || "Failed to login user");
  }
}

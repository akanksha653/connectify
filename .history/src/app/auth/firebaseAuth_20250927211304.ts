import { auth, database } from "@/lib/firebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";

// Register new user
export async function registerUser(email: string, password: string, userData: any) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const userId = userCredential.user.uid;

  // Save user info in Realtime Database
  await set(ref(database, `users/${userId}`), {
    ...userData,
    currentStatus: "idle",
    lastSeen: Date.now(),
  });

  return userId;
}

// Login existing user
export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user.uid;
}

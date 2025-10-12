// lib/firebaseConfig.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";      // Firestore
import { getDatabase } from "firebase/database";        // Realtime Database
import { getStorage } from "firebase/storage";          // Storage

// Your Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // optional
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Exports
export const auth = getAuth(app);               // Firebase Auth
export const db = getFirestore(app);            // Firestore instance
export const database = getDatabase(app);       // Realtime DB instance
export const storage = getStorage(app);         // Firebase Storage

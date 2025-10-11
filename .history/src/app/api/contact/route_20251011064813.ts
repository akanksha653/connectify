import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import sgMail from "@sendgrid/mail";

// ========================
// 🔥 Initialize Firebase
// ========================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!getApps().length) initializeApp(firebaseConfig);
const db = getFirestore();

// ========================
// 📧 Setup SendGrid
// ========================
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (!SENDGRID_API_KEY || !EMAIL_FROM || !EMAIL_TO) {
  console.error("❌ Missing required environment variables for SendGrid");
}

sgMail.setApiKey(SENDGRID_API_KEY!);

// ========================
// 📩 POST Handler
// ========================
export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Save message to Firestore
    await addDoc(collection(db, "contactMessages"), {
      name,
      email,
      message,
      timestamp: serverTimestamp(),
    });

    // Send email via SendGrid
    const msg = {
      to: EMAIL_TO!,
      from: EMAIL_FROM!, // ✅ must be verified sender
      subject: `📩 New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      html: `
        <h2>New Message from Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    await sgMail.send(msg);
    console.log("✅ Email sent successfully");

    return NextResponse.json({ message: "Message sent successfully ✅" });
  } catch (error: any) {
    // Log detailed SendGrid error if available
    console.error("❌ SendGrid or Firestore error:", error?.response?.body || error);

    return NextResponse.json(
      {
        message: "Internal server error",
        error: error?.response?.body?.errors?.[0]?.message || error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

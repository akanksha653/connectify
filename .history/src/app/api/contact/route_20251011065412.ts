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

if (!getApps().length) {
  console.log("⚙️ Initializing Firebase app...");
  initializeApp(firebaseConfig);
} else {
  console.log("✅ Firebase already initialized");
}

const db = getFirestore();

// ========================
// 📧 Setup SendGrid
// ========================
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (!SENDGRID_API_KEY || !EMAIL_FROM || !EMAIL_TO) {
  console.error("❌ Missing required environment variables for SendGrid:", {
    SENDGRID_API_KEY: !!SENDGRID_API_KEY,
    EMAIL_FROM,
    EMAIL_TO,
  });
} else {
  console.log("✅ SendGrid environment variables loaded");
}

sgMail.setApiKey(SENDGRID_API_KEY || "");

// ========================
// 📩 POST Handler
// ========================
export async function POST(req: NextRequest) {
  console.log("📩 Received contact form submission");

  try {
    const { name, email, message } = await req.json();

    // Step 1: Validate input
    if (!name || !email || !message) {
      console.warn("⚠️ Missing required fields:", { name, email, message });
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    console.log("📝 Valid data received:", { name, email });

    // Step 2: Save message to Firestore
    try {
      const docRef = await addDoc(collection(db, "contactMessages"), {
        name,
        email,
        message,
        timestamp: serverTimestamp(),
      });
      console.log("✅ Message saved to Firestore:", docRef.id);
    } catch (firebaseErr: any) {
      console.error("🔥 Firestore save failed:", firebaseErr);
      // Continue — still try to send email
    }

    // Step 3: Send email via SendGrid
    const msg = {
      to: EMAIL_TO!,
      from: EMAIL_FROM!, // must be verified in SendGrid
      subject: `📩 New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      html: `
        <h2>📬 New Message from Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    try {
      const response = await sgMail.send(msg);
      console.log("✅ Email sent successfully via SendGrid", response[0].statusCode);
    } catch (sgErr: any) {
      console.error("📮 SendGrid email error:", sgErr?.response?.body || sgErr);
      return NextResponse.json(
        {
          message: "Failed to send email",
          error: sgErr?.response?.body?.errors?.[0]?.message || sgErr.message,
        },
        { status: 500 }
      );
    }

    // Step 4: Final success
    console.log("🎉 Contact form processed successfully");
    return NextResponse.json({ message: "Message sent successfully ✅" });

  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

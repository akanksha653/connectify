import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Set SendGrid API key from Firebase config
const SENDGRID_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(SENDGRID_API_KEY);

// Email to receive contact messages
const RECEIVER_EMAIL = "your-email@example.com";

// Type for request body
interface ContactFormBody {
  name: string;
  email: string;
  message: string;
}

export const submitContactForm = functions.https.onRequest(
  async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({ message: "Method not allowed" });
      return;
    }

    try {
      // Parse body safely
      const body: ContactFormBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      const { name, email, message } = body;

      if (!name || !email || !message) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      // Save to Firestore
      const docRef = await db.collection("contactMessages").add({
        name,
        email,
        message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send email via SendGrid
      await sgMail.send({
        to: RECEIVER_EMAIL,
        from: "no-reply@connectify.com", // Verified sender
        subject: `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
        html: `<p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Message:</strong><br/>${message}</p>`,
      });

      res.status(200).json({ message: "Message submitted successfully", id: docRef.id });
    } catch (error: unknown) {
      console.error("Error submitting contact form:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

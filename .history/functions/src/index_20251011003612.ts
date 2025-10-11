import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

admin.initializeApp();
const db = admin.firestore();

// Get SendGrid API key from Firebase config
const SENDGRID_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(SENDGRID_API_KEY);

// Your email address to receive messages
const RECEIVER_EMAIL = "your-email@example.com";

// HTTPS function
export const submitContactForm = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Save to Firestore
    const docRef = await db.collection("contactMessages").add({
      name,
      email,
      message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email via SendGrid
    const msg = {
      to: RECEIVER_EMAIL,
      from: "no-reply@connectify.com", // Must be verified in SendGrid
      subject: `New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      html: `<p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Message:</strong><br/>${message}</p>`,
    };

    await sgMail.send(msg);

    return res.status(200).json({ message: "Message submitted successfully", id: docRef.id });
  } catch (error: any) {
    console.error("Error submitting contact form:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

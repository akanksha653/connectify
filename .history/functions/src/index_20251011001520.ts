import { onRequest } from "firebase-functions/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import sgMail from "@sendgrid/mail";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Configure SendGrid API Key (set in Firebase env variables)
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Function to save contact form data and send notification email
export const submitContactForm = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).send("All fields are required");
    }

    // Save to Firebase Realtime Database
    const newRef = admin.database().ref("contacts").push();
    await newRef.set({ name, email, message, timestamp: Date.now() });

    // Send email notification
    const msg = {
      to: "connectify.hub.in@gmail.com", // your email
      from: "no-reply@connectify.com",
      subject: "New Contact Form Submission",
      text: `You have a new message from ${name} (${email}):\n\n${message}`,
      html: `<p>You have a new message from <strong>${name}</strong> (${email}):</p><p>${message}</p>`,
    };

    await sgMail.send(msg);

    logger.info("Contact form submitted and email sent", { name, email });

    res.status(200).send({ success: true, message: "Form submitted successfully" });
  } catch (err) {
    logger.error("Error submitting contact form", err);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
});

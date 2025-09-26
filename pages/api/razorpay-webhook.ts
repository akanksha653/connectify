import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false, // Razorpay requires raw body for signature validation
  },
};

const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET || "your_razorpay_secret";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method not allowed");

  try {
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("❌ Invalid Razorpay Signature");
      return res.status(400).json({ status: "Invalid signature" });
    }

    const data = JSON.parse(body.toString());

    // ✅ Optional: log important fields
    console.log("✅ Webhook Received:", data.event);
    console.log("📌 Payment ID:", data.payload?.payment?.entity?.id);
    console.log("💰 Amount:", data.payload?.payment?.entity?.amount / 100);

    // ✅ Optional: store in DB here

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

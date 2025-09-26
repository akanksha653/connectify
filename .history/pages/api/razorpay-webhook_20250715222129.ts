import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false, // Important: we'll parse raw body manually
  },
};

const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET || "your_razorpay_secret"; // secure in .env

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method not allowed");

  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const signature = req.headers["x-razorpay-signature"];

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_SECRET)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(400).json({ status: "Invalid signature" });
  }

  const data = JSON.parse(body.toString());

  // You can store transaction info in DB here
  console.log("✅ Verified Payment:", data);

  res.status(200).json({ received: true });
}

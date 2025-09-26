// pages/api/create-upi-link.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY!,
  key_secret: process.env.RAZORPAY_SECRET!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { amount } = req.body;

  try {
    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100,
      currency: "INR",
      description: "Donate to Connectify",
      customer: {
        name: "Anonymous Donor",
        email: "connectify.donate@example.com",
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      callback_url: "https://yourdomain.com/donate/success",
      callback_method: "get",
      upi_link: true, // Enable UPI QR
    });

    res.status(200).json({ short_url: paymentLink.short_url });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create UPI link" });
  }
}

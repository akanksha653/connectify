"use client";

import React, { useState } from "react";
import { Heart, IndianRupee } from "lucide-react";
import { useRouter } from "next/navigation";
import { loadRazorpayScript } from "@/lib/razorpay";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function DonatePage() {
  const router = useRouter();
  const [customAmount, setCustomAmount] = useState("");

  const handleDonation = async (amount: number) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) return alert("Failed to load Razorpay. Please try again.");

    const options = {
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY!, // ✅ Load from .env
  amount: amount * 100, // in paise
  currency: "INR",
  name: "Connectify",
  description: "Support our mission ❤️",
  image: "/logo.png", // optional
  handler: function (response: any) {
    const paymentId = response.razorpay_payment_id;
    router.push(`/donate/success?payment_id=${paymentId}&amount=${amount}`);
  },
  prefill: {
    name: "",
    email: "",
  },
  theme: {
    color: "#ec4899",
  },
};
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-10 text-neutral-800 dark:text-neutral-100">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-semibold">Support Connectify with a Donation</h1>
      </div>

      <p className="mb-4 text-sm sm:text-base">
        Love using Connectify? Help keep it alive and ad-free by supporting us with a donation.
      </p>

      <div className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 p-4 rounded-lg shadow mb-6">
        ❤️ Every donation — big or small — helps us improve and scale the platform.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[10, 25, 50, 100].map((amt) => (
          <button
            key={amt}
            onClick={() => handleDonation(amt)}
            className="bg-pink-600 hover:bg-pink-700 text-white font-medium px-5 py-2 rounded-lg shadow transition text-sm"
          >
            ₹{amt}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md mb-4">
        <label className="block mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          🎁 Or enter a custom amount:
        </label>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-700 px-3 py-2 rounded-md">
            <IndianRupee className="w-4 h-4 text-neutral-500 dark:text-neutral-300" />
            <input
              type="number"
              min={1}
              className="bg-transparent outline-none ml-1 text-sm w-24 text-neutral-900 dark:text-white"
              placeholder="Amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              const amt = parseInt(customAmount);
              if (!amt || amt <= 0) return alert("Enter a valid amount.");
              handleDonation(amt);
            }}
            className="bg-pink-600 hover:bg-pink-700 text-white text-sm px-4 py-2 rounded-lg shadow transition"
          >
            Donate
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-6">
        Payments are securely processed via Razorpay. For queries, contact{" "}
        <a href="mailto:connectify.hub.in@gmail.com" className="underline">
          connectify.hub.in@gmail.com
        </a>
      </p>
    </main>
  );
}

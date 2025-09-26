// app/donate/page.tsx
"use client";

import React from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { loadRazorpayScript } from "@/lib/razorpay";

export default function DonatePage() {
  const router = useRouter();

  const handleDonation = async (amount: number) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) return alert("Failed to load Razorpay. Please try again.");

    const options = {
      key: "YOUR_RAZORPAY_KEY", // replace with your Razorpay key
      amount: amount * 100, // amount in paise
      currency: "INR",
      name: "Connectify",
      description: "Support our mission ❤️",
      image: "/logo.png", // optional logo
      handler: function (response: any) {
        console.log("Payment success:", response);
        router.push("/donate/success");
      },
      theme: {
        color: "#ec4899",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 text-neutral-800 dark:text-neutral-100">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-semibold">Support Us with a Donation</h1>
      </div>

      <p className="mb-4">
        If you love using Connectify and want to support the project, consider donating.
        Your contribution helps keep this platform alive and free for everyone.
      </p>

      <div className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 p-4 rounded-lg shadow mb-6">
        ❤️ Every donation — big or small — means a lot. Thank you for supporting us!
      </div>

      <div className="space-y-4">
        <button
          onClick={() => handleDonation(100)}
          className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white font-medium px-5 py-2 rounded-lg shadow transition"
        >
          Donate ₹100
        </button>
        <button
          onClick={() => handleDonation(250)}
          className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white font-medium px-5 py-2 rounded-lg shadow transition"
        >
          Donate ₹250
        </button>
        <button
          onClick={() => handleDonation(0)}
          className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white font-medium px-5 py-2 rounded-lg shadow transition"
        >
          Custom Amount (Coming soon)
        </button>
      </div>

      <p className="text-sm mt-6 text-neutral-500 dark:text-neutral-400">
        Payments are securely processed via Razorpay. For any issues, contact{" "}
        <a href="mailto:donate@connectify.chat" className="underline">
          donate@connectify.chat
        </a>
      </p>
    </main>
  );
}

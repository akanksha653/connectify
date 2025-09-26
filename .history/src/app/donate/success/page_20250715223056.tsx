"use client";

import { CheckCircle, Download } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { jsPDF } from "jspdf";

export default function DonateSuccessPage() {
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);

  const searchParams = typeof window !== "undefined" ? useSearchParams() : null;

  useEffect(() => {
    if (!searchParams) return;
    const pid = searchParams.get("payment_id");
    const amt = searchParams.get("amount");
    setPaymentId(pid);
    setAmount(amt);
  }, [searchParams]);

  const handleDownloadReceipt = () => {
    if (!paymentId || !amount) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Connectify Donation Receipt", 20, 20);
    doc.setFontSize(12);
    doc.text(`Payment ID: ${paymentId}`, 20, 40);
    doc.text(`Amount: ₹${amount}`, 20, 50);
    doc.text(`Status: Confirmed`, 20, 60);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 70);
    doc.save(`receipt_${paymentId}.pdf`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-white dark:from-green-900 dark:to-neutral-900 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 w-full max-w-md text-center"
      >
        <CheckCircle className="text-green-600 w-12 h-12 mx-auto mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
          Payment Successful!
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
          Thank you for your donation 💖. Your support helps us keep Connectify free and growing.
        </p>

        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 text-left text-sm text-neutral-800 dark:text-white shadow-inner mb-6">
          <p className="mb-1 font-medium">🧾 Donation Receipt</p>
          {paymentId ? (
            <>
              <div className="border-t border-neutral-300 dark:border-neutral-600 my-2 pt-2 space-y-1">
                <p>
                  <span className="font-semibold">Payment ID:</span>{" "}
                  <span className="break-words">{paymentId}</span>
                </p>
                {amount && (
                  <p>
                    <span className="font-semibold">Amount:</span> ₹{amount}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Status:</span> Confirmed ✅
                </p>
              </div>
              <button
                onClick={handleDownloadReceipt}
                className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow transition"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </>
          ) : (
            <p className="text-red-500">No payment details found.</p>
          )}
        </div>

        <Link
          href="/"
          className="inline-block px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow transition"
        >
          Back to Home
        </Link>
      </motion.div>
    </main>
  );
}

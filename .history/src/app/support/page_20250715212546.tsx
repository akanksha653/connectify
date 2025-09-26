// app/support/page.tsx
"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

export default function SupportPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 text-neutral-800 dark:text-neutral-100">
      <div className="flex items-center gap-2 mb-6">
        <HelpCircle className="w-6 h-6 text-blue-500" />
        <h1 className="text-2xl font-semibold">Support</h1>
      </div>
      <p className="mb-4">
        If you're experiencing any issues or have questions about using Connectify,
        we’re here to help!
      </p>

      <ul className="list-disc list-inside space-y-2">
        <li>
          Check our FAQ (Coming soon) for answers to common questions.
        </li>
        <li>
          Contact our support team via the <strong>Contact Us</strong> page.
        </li>
        <li>
          You can also reach us directly at{" "}
          <a
            href="mailto:support@connectify.chat"
            className="text-blue-600 dark:text-blue-400 underline"
          >
            support@connectify.chat
          </a>
        </li>
      </ul>
    </main>
  );
}

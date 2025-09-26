import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ProfileDropdown from "@/components/common/ProfileDropdown"; // ✅ Import added

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Connectify",
  description: "Anonymous real-time chat & video app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 transition-colors duration-300`}
      >
        {/* ✅ Profile Dropdown Header */}
        <header className="w-full px-6 py-4 flex justify-end">
          <ProfileDropdown />
        </header>

        {children}
      </body>
    </html>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Sun,
  Moon,
  Heart,
  Mail,
  HelpCircle,
} from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);
  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const linkClass = (path: string) =>
    `flex items-center gap-1 text-sm transition ${
      pathname === path
        ? "text-blue-600 dark:text-blue-400 font-medium"
        : "text-neutral-700 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur shadow-sm border-b border-neutral-200 dark:border-neutral-700">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
          <Link href="/">Anonymous Chat</Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={toggleTheme}
            className="text-neutral-700 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
            title="Toggle Dark Mode"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <Link href="/support" className={linkClass("/support")}>
            <HelpCircle className="w-4 h-4" />
            Support
          </Link>

          <Link href="/contact" className={linkClass("/contact")}>
            <Mail className="w-4 h-4" />
            Contact Us
          </Link>

          <Link
            href="/donate"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm shadow"
          >
            <Heart className="w-4 h-4" />
            Donate
          </Link>

          <ProfileDropdown />
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="text-neutral-700 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
            title="Toggle Dark Mode"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleMenu}
            className="text-neutral-800 dark:text-neutral-100 focus:outline-none"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden px-4 pb-4 space-y-3 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <Link href="/support" className={linkClass("/support")}>
            Support
          </Link>
          <Link href="/contact" className={linkClass("/contact")}>
            Contact Us
          </Link>
          <Link
            href="/donate"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm shadow"
          >
            <Heart className="w-4 h-4" />
            Donate
          </Link>
          <div className="pt-2 border-t border-neutral-300 dark:border-neutral-600">
            <ProfileDropdown />
          </div>
        </div>
      )}
    </nav>
  );
}

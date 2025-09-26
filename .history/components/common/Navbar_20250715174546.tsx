"use client";

import React, { useState } from "react";
import Link from "next/link";
import ProfileDropdown from "./ProfileDropdown";
import { HelpCircle, Mail, Heart, Menu, X } from "lucide-react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
      <div className="max-w-screen-2xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3">
        {/* Brand */}
        <Link
          href="/"
          className="text-lg sm:text-xl font-semibold text-blue-600 dark:text-blue-400"
        >
          Anonymous Chat by Param
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/support"
            className="flex items-center gap-1 text-sm text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <HelpCircle className="w-4 h-4" />
            Support
          </Link>
          <Link
            href="/contact"
            className="flex items-center gap-1 text-sm text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <Mail className="w-4 h-4" />
            Contact Us
          </Link>
          <Link
            href="/donate"
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-pink-600 hover:bg-pink-700 text-white rounded-full shadow transition"
          >
            <Heart className="w-4 h-4" />
            Donate
          </Link>
          <ProfileDropdown />
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-neutral-700 dark:text-neutral-300"
          onClick={toggleMenu}
          aria-label="Toggle Menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 px-4 py-3 space-y-3">
          <Link
            href="/support"
            onClick={closeMenu}
            className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <HelpCircle className="w-4 h-4" />
            Support
          </Link>
          <Link
            href="/contact"
            onClick={closeMenu}
            className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <Mail className="w-4 h-4" />
            Contact Us
          </Link>
          <Link
            href="/donate"
            onClick={closeMenu}
            className="flex items-center gap-2 text-sm bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-full shadow transition"
          >
            <Heart className="w-4 h-4" />
            Donate
          </Link>

          {/* Profile Dropdown for mobile (reuses component) */}
          <div className="pt-2 border-t border-neutral-300 dark:border-neutral-700">
            <ProfileDropdown />
          </div>
        </div>
      )}
    </header>
  );
}

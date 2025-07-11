"use client";

import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

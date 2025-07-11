"use client";

import React from "react";

export default function Loader() {
  return (
    <div className="flex justify-center items-center py-10">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

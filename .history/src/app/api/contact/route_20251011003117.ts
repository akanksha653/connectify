// app/api/contact/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Call your Firebase function
    const functionUrl = `https://YOUR_PROJECT_ID.cloudfunctions.net/submitContactForm`;

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ message: data.message || "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ message: "Message sent successfully", id: data.id });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

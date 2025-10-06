"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "./firebaseAuth";
import { useAuth } from "./authContext";

export default function LoginPage() {
  const { setUserId } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      const uid = await loginUser(email, password);
      setUserId(uid);
      router.push("/anonymous"); // Redirect after login
    } catch (err) {
      console.error(err);
      alert("Login error: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 px-4">
      <h1 className="text-2xl font-bold mb-4">Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full max-w-md px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full max-w-md px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md shadow-md transition"
      >
        {loading ? "Logging in..." : "Login"}
      </button>

      <p className="text-sm text-gray-600 mt-2">
        Don’t have an account?{" "}
        <a href="/auth/register" className="text-blue-600 hover:underline">
          Register here
        </a>
      </p>
    </div>
  );
}

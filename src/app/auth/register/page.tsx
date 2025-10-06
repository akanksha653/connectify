"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "../firebaseAuth";
import { useAuth } from "../authContext";

export default function RegisterPage() {
  const { setUserId } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !age || !gender || !country) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      const uid = await registerUser(email, password, {
        name,
        age: Number(age),
        gender,
        country,
        currentStatus: "idle",
      });
      setUserId(uid);
      router.replace("/home"); // ✅ redirect after register
    } catch (err: any) {
      console.error(err);
      alert("Registration error: " + err.message || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 px-4">
      <h1 className="text-2xl font-bold mb-4">Register</h1>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full max-w-md px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
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
      <input
        type="number"
        placeholder="Age"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        className="w-full max-w-md px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="w-full max-w-md px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Gender"
      >
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
      <input
        type="text"
        placeholder="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="w-full max-w-md px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md shadow-md transition"
      >
        {loading ? "Registering..." : "Register"}
      </button>
    </div>
  );
}

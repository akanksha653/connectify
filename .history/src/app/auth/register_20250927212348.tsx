"use client";

import { useState } from "react";
import { registerUser } from "./firebaseAuth";
import { useAuth } from "./authContext";

export default function RegisterPage() {
  const { setUserId } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password || !age || !gender || !country) {
      alert("Please fill all fields");
      return;
    }

    try {
      const uid = await registerUser(email, password, {
        name,
        age: Number(age),
        gender,
        country,
        currentStatus: "idle",
      });
      setUserId(uid);
    } catch (err) {
      console.error(err);
      alert("Registration error: " + err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-2">
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="input-field"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="input-field"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="input-field"
      />
      <input
        type="number"
        placeholder="Age"
        value={age}
        onChange={e => setAge(e.target.value)}
        className="input-field"
      />
      <select value={gender} onChange={e => setGender(e.target.value)} className="input-field">
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
      <input
        type="text"
        placeholder="Country"
        value={country}
        onChange={e => setCountry(e.target.value)}
        className="input-field"
      />
      <button onClick={handleRegister} className="btn-primary">
        Register
      </button>
    </div>
  );
}

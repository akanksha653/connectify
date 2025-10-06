// Example src/app/auth/register.tsx
"use client";
import { useState } from "react";
import { registerUser } from "./firebaseAuth";
import { useAuth } from "./authContext";

export default function RegisterPage() {
  const { setUserId } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleRegister = async () => {
    const uid = await registerUser(email, password, { name });
    setUserId(uid);
  };

  return (
    <div>
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleRegister}>Register</button>
    </div>
  );
}

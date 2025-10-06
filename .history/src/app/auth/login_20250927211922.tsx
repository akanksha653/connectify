// Example src/app/auth/login.tsx
"use client";
import { useState } from "react";
import { loginUser } from "./firebaseAuth";
import { useAuth } from "./authContext";

export default function LoginPage() {
  const { setUserId } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const uid = await loginUser(email, password);
    setUserId(uid);
  };

  return (
    <div>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

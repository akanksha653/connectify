"use client";

import { useState } from "react";
import { registerUser, loginUser } from "./firebaseAuth";
import { useAuth } from "./authContext";

export default function AuthPage() {
  const { setUserId } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async () => {
    try {
      let uid;
      if (isRegister) {
        uid = await registerUser(email, password, { name });
      } else {
        uid = await loginUser(email, password);
      }
      setUserId(uid);
    } catch (err) {
      console.error(err);
      alert("Error: " + err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {isRegister && (
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      )}
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button onClick={handleSubmit}>{isRegister ? "Register" : "Login"}</button>
      <button onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? "Switch to Login" : "Switch to Register"}
      </button>
    </div>
  );
}

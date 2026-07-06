"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthModal() {
  const { modalOpen, closeModal, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!modalOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, fullName);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-modal-backdrop" onClick={closeModal}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={closeModal}>×</button>
        <div className="auth-modal-title">{mode === "login" ? "Sign in" : "Create account"}</div>
        <div className="auth-modal-sub">
          {mode === "login" ? "Sign in to save your favourite constituencies and regions." : "Create a free account to start saving favourites."}
        </div>

        <form onSubmit={handleSubmit} className="auth-modal-form">
          {mode === "register" && (
            <input
              className="auth-modal-input" type="text" placeholder="Full name"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required
            />
          )}
          <input
            className="auth-modal-input" type="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <input
            className="auth-modal-input" type="password" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
          />
          {error && <div className="auth-modal-error">{error}</div>}
          <button className="auth-modal-submit" type="submit" disabled={loading}>
            {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-modal-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="center-screen">
      <div className="card narrow" style={{ width: "100%" }}>
        <div className="brand" style={{ marginBottom: 8 }}>
          HealthApp <small>AI Telemedicine</small>
        </div>
        <h1>Sign in</h1>
        <p className="muted">Welcome back. Sign in to your account.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <label>Email or username</label>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <div style={{ marginTop: 16 }}>
            <button className="btn" disabled={loading} type="submit">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          No account? <Link href="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

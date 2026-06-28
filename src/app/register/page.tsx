"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Role } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("patient");
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    specialization: "",
    bio: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Registration failed.");
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
        <h1>Create account</h1>

        <div className="tabs" style={{ marginTop: 12 }}>
          <div className={`tab ${role === "patient" ? "active" : ""}`} onClick={() => setRole("patient")}>
            I&apos;m a Patient
          </div>
          <div className={`tab ${role === "doctor" ? "active" : ""}`} onClick={() => setRole("doctor")}>
            I&apos;m a Doctor
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <label>Full name</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} />
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <label>Username</label>
          <input value={form.username} onChange={(e) => set("username", e.target.value)} />
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />

          {role === "doctor" && (
            <>
              <label>Specialization</label>
              <input
                value={form.specialization}
                onChange={(e) => set("specialization", e.target.value)}
                placeholder="e.g. Cardiology, General Practice"
              />
              <label>Short bio (optional)</label>
              <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} />
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <button className="btn" disabled={loading} type="submit">
              {loading ? "Creating…" : `Create ${role} account`}
            </button>
          </div>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

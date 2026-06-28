"use client";

import { useRouter } from "next/navigation";
import type { SafeUser } from "@/lib/types";

export default function Topbar({ user }: { user: SafeUser }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="topbar">
      <div className="brand">
        HealthApp <small>AI Telemedicine</small>
      </div>
      <div className="row">
        <span className="muted">
          {user.name} · <strong>{user.role === "doctor" ? `Dr · ${user.specialization}` : "Patient"}</strong>
        </span>
        <button className="btn secondary sm" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}

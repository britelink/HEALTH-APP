"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SafeUser } from "@/lib/types";

interface ApptView {
  id: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  status: "pending" | "approved" | "declined";
  consultationId: string | null;
}

export default function DoctorDashboard({ user }: { user: SafeUser }) {
  const [appts, setAppts] = useState<ApptView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const a = await fetch("/api/appointments").then((r) => r.json());
    setAppts(a.appointments || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "approve" | "decline") {
    setBusy(id);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    load();
  }

  const pending = appts.filter((a) => a.status === "pending");
  const active = appts.filter((a) => a.status === "approved");
  const past = appts.filter((a) => a.status === "declined");

  return (
    <div>
      <div className="card">
        <h1>Dr. {user.name}</h1>
        <p className="muted">{user.specialization} · Manage your appointment requests and consultations.</p>
      </div>

      <div className="card">
        <h2>Pending requests</h2>
        {pending.length === 0 && <p className="muted">No pending requests.</p>}
        {pending.map((a) => (
          <div className="list-item" key={a.id}>
            <div className="row">
              <strong>{a.patientName}</strong>
              <span className="badge pending">pending</span>
              <span className="spacer" />
              <span className="muted">
                {a.date} · {a.time}
              </span>
            </div>
            <div className="muted" style={{ margin: "4px 0" }}>
              {a.reason}
            </div>
            <div className="row">
              <button className="btn sm" disabled={busy === a.id} onClick={() => act(a.id, "approve")}>
                Approve
              </button>
              <button className="btn danger sm" disabled={busy === a.id} onClick={() => act(a.id, "decline")}>
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Active consultations</h2>
        {active.length === 0 && <p className="muted">No approved consultations yet.</p>}
        {active.map((a) => (
          <div className="list-item" key={a.id}>
            <div className="row">
              <strong>{a.patientName}</strong>
              <span className="badge approved">approved</span>
              <span className="spacer" />
              <span className="muted">
                {a.date} · {a.time}
              </span>
            </div>
            <div className="muted" style={{ margin: "4px 0" }}>
              {a.reason}
            </div>
            {a.consultationId && (
              <Link className="btn accent sm" href={`/consultation/${a.consultationId}`}>
                Open consultation room
              </Link>
            )}
          </div>
        ))}
      </div>

      {past.length > 0 && (
        <div className="card">
          <h2>Declined</h2>
          {past.map((a) => (
            <div className="list-item" key={a.id}>
              <div className="row">
                <strong>{a.patientName}</strong>
                <span className="badge declined">declined</span>
                <span className="spacer" />
                <span className="muted">
                  {a.date} · {a.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

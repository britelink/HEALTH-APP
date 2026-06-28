"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SafeUser, AvailabilitySlot } from "@/lib/types";

interface DoctorView {
  id: string;
  name: string;
  specialization: string;
  bio: string;
  availability: AvailabilitySlot[];
}
interface ApptView {
  id: string;
  doctorName: string;
  specialization?: string;
  date: string;
  time: string;
  reason: string;
  status: "pending" | "approved" | "declined";
  consultationId: string | null;
}

export default function PatientDashboard({ user }: { user: SafeUser }) {
  const [doctors, setDoctors] = useState<DoctorView[]>([]);
  const [appts, setAppts] = useState<ApptView[]>([]);
  const [form, setForm] = useState({ doctorId: "", date: "", time: "", reason: "" });
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);

  async function load() {
    const [d, a] = await Promise.all([
      fetch("/api/doctors").then((r) => r.json()),
      fetch("/api/appointments").then((r) => r.json()),
    ]);
    setDoctors(d.doctors || []);
    setAppts(a.appointments || []);
  }

  useEffect(() => {
    load();
  }, []);

  const selectedDoctor = doctors.find((d) => d.id === form.doctorId);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.doctorId || !form.date || !form.time || !form.reason) {
      setError("Please choose a doctor and fill in date, time and reason.");
      return;
    }
    setBooking(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBooking(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Booking failed.");
      return;
    }
    setForm({ doctorId: "", date: "", time: "", reason: "" });
    load();
  }

  return (
    <div className="grid cols-2">
      <div>
        <div className="card">
          <h1>Welcome, {user.name}</h1>
          <p className="muted">Book an appointment with an available doctor.</p>
          {error && <div className="error">{error}</div>}
          <form onSubmit={book}>
            <label>Doctor</label>
            <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
              <option value="">Select a doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.name} — {d.specialization}
                </option>
              ))}
            </select>

            {selectedDoctor && (
              <div className="notice" style={{ marginTop: 8 }}>
                <strong>Dr. {selectedDoctor.name}</strong> · {selectedDoctor.specialization}
                {selectedDoctor.bio ? <div className="muted">{selectedDoctor.bio}</div> : null}
                <div className="muted" style={{ marginTop: 6 }}>
                  Availability:{" "}
                  {selectedDoctor.availability.length
                    ? selectedDoctor.availability.map((s) => `${s.day} ${s.start}-${s.end}`).join(", ")
                    : "Not specified — request a time below."}
                </div>
              </div>
            )}

            <div className="row">
              <div style={{ flex: 1 }}>
                <label>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Time</label>
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>

            <label>Reason for visit</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Describe your symptoms or concern…"
            />
            <div style={{ marginTop: 12 }}>
              <button className="btn" disabled={booking} type="submit">
                {booking ? "Requesting…" : "Request appointment"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div>
        <div className="card">
          <h2>My appointments</h2>
          {appts.length === 0 && <p className="muted">No appointments yet.</p>}
          {appts.map((a) => (
            <div className="list-item" key={a.id}>
              <div className="row">
                <strong>Dr. {a.doctorName}</strong>
                <span className={`badge ${a.status}`}>{a.status}</span>
                <span className="spacer" />
                <span className="muted">
                  {a.date} · {a.time}
                </span>
              </div>
              <div className="muted" style={{ margin: "4px 0" }}>
                {a.specialization} — {a.reason}
              </div>
              {a.status === "approved" && a.consultationId && (
                <Link className="btn accent sm" href={`/consultation/${a.consultationId}`}>
                  Enter consultation room
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SafeUser } from "@/lib/types";

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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function PatientDashboard({ user }: { user: SafeUser }) {
  const [appts, setAppts] = useState<ApptView[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi ${user.name.split(" ")[0]}! I'm your Health Concierge. Tell me what's bothering you or which doctor you'd like to see, and I'll book it for you. You can also ask me about your existing appointments.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function loadAppts() {
    const a = await fetch("/api/appointments").then((r) => r.json());
    setAppts(a.appointments || []);
  }

  useEffect(() => {
    loadAppts();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);

    const res = await fetch("/api/patient/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setMessages((m) => [...m, { role: "assistant", content: data.error || "Something went wrong." }]);
      return;
    }
    setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    if (data.appointments) setAppts(data.appointments);
  }

  return (
    <div className="grid cols-2">
      {/* Concierge chat */}
      <div className="card ai-panel" style={{ display: "flex", flexDirection: "column" }}>
        <div className="row">
          <h2 style={{ margin: 0 }}>💬 Health Concierge</h2>
          <span className="spacer" />
          <span className="muted">AI booking assistant</span>
        </div>
        <div className="chat" style={{ maxHeight: 440, flex: 1, marginTop: 12 }}>
          {messages.map((m, i) => (
            <div className={`bubble ${m.role === "user" ? "patient" : "doctor"}`} key={i}>
              <div className="who">{m.role === "user" ? "You" : "Concierge"}</div>
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="bubble doctor">
              <div className="who">Concierge</div>
              <span className="muted">Thinking…</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="e.g. I've had a sore throat for 3 days, book me with a GP tomorrow at 10am"
          />
          <button className="btn" disabled={busy} onClick={send}>
            Send
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          The concierge books appointments and answers questions. It does not diagnose — your doctor does that in the consultation.
        </p>
      </div>

      {/* Appointments */}
      <div>
        <div className="card">
          <h1 style={{ fontSize: 20 }}>My appointments</h1>
          {appts.length === 0 && <p className="muted">No appointments yet. Ask the concierge to book one.</p>}
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

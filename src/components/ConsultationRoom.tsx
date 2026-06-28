"use client";

import { useRef, useState } from "react";
import type { SafeUser } from "@/lib/types";

interface SerializedConsultation {
  id: string;
  patientName: string;
  doctorName: string;
  reason: string;
  status: "open" | "closed";
  notes: { text: string; createdAt: string }[];
  prescriptions: { medication: string; dosage: string; instructions: string; createdAt: string }[];
  messages: { senderRole: "doctor" | "patient"; senderName: string; text: string; createdAt: string }[];
}

interface AgentTurn {
  role: "user" | "assistant";
  content: string;
}

export default function ConsultationRoom({
  user,
  initial,
}: {
  user: SafeUser;
  initial: SerializedConsultation;
}) {
  const [c, setC] = useState<SerializedConsultation>(initial);
  const isDoctor = user.role === "doctor";

  // ---- doctor note / prescription form ----
  const [note, setNote] = useState("");
  const [rx, setRx] = useState({ medication: "", dosage: "", instructions: "" });
  const [savingNote, setSavingNote] = useState(false);

  async function addNote() {
    if (!note.trim() && !rx.medication.trim()) return;
    setSavingNote(true);
    const res = await fetch(`/api/consultations/${c.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: note.trim() || undefined,
        prescription: rx.medication.trim() ? rx : undefined,
      }),
    });
    setSavingNote(false);
    const data = await res.json();
    if (data.consultation) {
      setC(data.consultation);
      setNote("");
      setRx({ medication: "", dosage: "", instructions: "" });
    }
  }

  // ---- chat ----
  const [chat, setChat] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMessage() {
    if (!chat.trim()) return;
    setSending(true);
    const res = await fetch(`/api/consultations/${c.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: chat.trim() }),
    });
    setSending(false);
    const data = await res.json();
    if (data.consultation) {
      setC(data.consultation);
      setChat("");
    }
  }

  // ---- AI assistant (streaming) ----
  const [aiInput, setAiInput] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const historyRef = useRef<AgentTurn[]>([]);

  async function askAgent() {
    if (!aiInput.trim() || aiBusy) return;
    const question = aiInput.trim();
    setAiInput("");
    setAiOutput("");
    setAiBusy(true);

    const res = await fetch(`/api/consultations/${c.id}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, history: historyRef.current }),
    });

    if (!res.body) {
      setAiOutput("No response from the AI service.");
      setAiBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      setAiOutput(acc);
    }

    historyRef.current = [
      ...historyRef.current,
      { role: "user", content: question },
      { role: "assistant", content: acc },
    ].slice(-10);
    setAiBusy(false);
  }

  const aiTitle = isDoctor ? "Clinical Copilot" : "Health Guide";
  const aiHint = isDoctor
    ? "Ask for a differential, investigations, or a prescription/interaction check."
    : "Ask what your diagnosis, notes, or medicines mean in plain language.";

  return (
    <div>
      <div className="card">
        <div className="row">
          <h1>Consultation</h1>
          <span className="spacer" />
          <span className="badge approved">{c.status}</span>
        </div>
        <p className="muted">
          <strong>Patient:</strong> {c.patientName} &nbsp;·&nbsp; <strong>Doctor:</strong> Dr. {c.doctorName}
        </p>
        <div className="notice">
          <strong>Reason for visit:</strong> {c.reason}
        </div>
      </div>

      <div className="grid cols-2">
        {/* Notes & prescriptions */}
        <div className="card">
          <h2>Clinical notes &amp; prescription</h2>

          <h3>Notes</h3>
          {c.notes.length === 0 && <p className="muted">No notes yet.</p>}
          {c.notes.map((n, i) => (
            <div className="list-item" key={i}>
              {n.text}
              <div className="muted" style={{ fontSize: 12 }}>
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          ))}

          <h3 style={{ marginTop: 16 }}>Prescriptions</h3>
          {c.prescriptions.length === 0 && <p className="muted">No prescriptions yet.</p>}
          {c.prescriptions.map((p, i) => (
            <div className="list-item" key={i}>
              <strong>{p.medication}</strong> {p.dosage}
              <div className="muted">{p.instructions}</div>
            </div>
          ))}

          {isDoctor && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <h3>Add note / prescription</h3>
              <label>Clinical note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Assessment, plan, observations…" />
              <label>Medication</label>
              <input value={rx.medication} onChange={(e) => setRx({ ...rx, medication: e.target.value })} placeholder="e.g. Amoxicillin" />
              <div className="row">
                <div style={{ flex: 1 }}>
                  <label>Dosage</label>
                  <input value={rx.dosage} onChange={(e) => setRx({ ...rx, dosage: e.target.value })} placeholder="500mg" />
                </div>
                <div style={{ flex: 2 }}>
                  <label>Instructions</label>
                  <input value={rx.instructions} onChange={(e) => setRx({ ...rx, instructions: e.target.value })} placeholder="3x daily for 7 days, after food" />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn" disabled={savingNote} onClick={addNote}>
                  {savingNote ? "Saving…" : "Save to consultation"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="card">
          <h2>Messages</h2>
          <div className="chat">
            {c.messages.length === 0 && <p className="muted">No messages yet. Say hello.</p>}
            {c.messages.map((m, i) => (
              <div className={`bubble ${m.senderRole}`} key={i}>
                <div className="who">
                  {m.senderRole === "doctor" ? "Dr. " : ""}
                  {m.senderName} · {new Date(m.createdAt).toLocaleTimeString()}
                </div>
                {m.text}
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <input
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Write a message…"
            />
            <button className="btn" disabled={sending} onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>

      {/* AI assistant */}
      <div className="card ai-panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>🩺 {aiTitle}</h2>
          <span className="spacer" />
          <span className="muted">AI · {isDoctor ? "for doctors" : "for patients"}</span>
        </div>
        <p className="muted">{aiHint}</p>
        <div className="ai-output">{aiOutput || <span className="muted">The AI assistant&apos;s reply will appear here.</span>}</div>
        <div className="row" style={{ marginTop: 12 }}>
          <input
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askAgent()}
            placeholder={isDoctor ? "e.g. Differential for this presentation?" : "e.g. What does my prescription mean?"}
          />
          <button className="btn" disabled={aiBusy} onClick={askAgent}>
            {aiBusy ? "Thinking…" : "Ask"}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          AI assistance is decision support only and does not replace professional medical judgement.
        </p>
      </div>
    </div>
  );
}

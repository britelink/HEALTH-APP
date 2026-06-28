import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { runPatientAgent, type ChatTurn } from "@/lib/patientAgent";
import type { Appointment } from "@/lib/types";

// Conversational concierge for patients: books and manages appointments via chat.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (me.role !== "patient") {
    return NextResponse.json({ error: "Patients only." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { message, history } = (body || {}) as { message?: string; history?: ChatTurn[] };
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  let reply: string;
  try {
    reply = await runPatientAgent({
      patient: me,
      history: Array.isArray(history) ? history.slice(-12) : [],
      message: message.trim(),
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `AI service error: ${m}` }, { status: 502 });
  }

  // Return the patient's current appointments so the UI can reflect any new booking.
  const db = await getDb();
  const appts = await db
    .collection<Appointment>("appointments")
    .find({ patientId: me._id })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    reply,
    appointments: appts.map((a) => ({
      id: a._id.toString(),
      doctorName: a.doctorName,
      specialization: a.specialization,
      date: a.date,
      time: a.time,
      reason: a.reason,
      status: a.status,
      consultationId: a.consultationId?.toString() || null,
    })),
  });
}

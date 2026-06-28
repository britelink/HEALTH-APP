import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { loadConsultationFor, serializeConsultation } from "@/lib/consultations";
import type { Consultation, ConsultationNote, Prescription } from "@/lib/types";

// Doctor adds a clinical note and/or a prescription to the consultation.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (me.role !== "doctor") {
    return NextResponse.json({ error: "Only doctors can add notes or prescriptions." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const consultation = await loadConsultationFor(id, me);
  if (!consultation) return NextResponse.json({ error: "Consultation not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const { note, prescription } = (body || {}) as {
    note?: string;
    prescription?: { medication?: string; dosage?: string; instructions?: string };
  };

  // A single $push can append to both arrays at once (different keys).
  const push: Record<string, unknown> = {};

  if (note && note.trim()) {
    const n: ConsultationNote = { text: note.trim(), createdAt: new Date() };
    push.notes = n;
  }
  if (prescription && prescription.medication) {
    const p: Prescription = {
      medication: prescription.medication,
      dosage: prescription.dosage || "",
      instructions: prescription.instructions || "",
      createdAt: new Date(),
    };
    push.prescriptions = p;
  }

  if (!push.notes && !push.prescriptions) {
    return NextResponse.json({ error: "Provide a note or a prescription." }, { status: 400 });
  }

  const db = await getDb();
  await db
    .collection<Consultation>("consultations")
    .updateOne({ _id: new ObjectId(id) }, { $push: push as never });

  const fresh = await loadConsultationFor(id, me);
  return NextResponse.json({ consultation: fresh ? serializeConsultation(fresh) : null });
}

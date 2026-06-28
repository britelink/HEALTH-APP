import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { Consultation, User } from "./types";

/**
 * Load a consultation and verify the user is a participant (its doctor or patient).
 * Returns null if not found or the user isn't allowed to see it.
 */
export async function loadConsultationFor(
  id: string,
  user: User
): Promise<Consultation | null> {
  const db = await getDb();
  let consultation: Consultation | null = null;
  try {
    consultation = await db
      .collection<Consultation>("consultations")
      .findOne({ _id: new ObjectId(id) });
  } catch {
    return null;
  }
  if (!consultation) return null;
  if (!consultation.patientId.equals(user._id) && !consultation.doctorId.equals(user._id)) {
    return null;
  }
  return consultation;
}

export function serializeConsultation(c: Consultation) {
  return {
    id: c._id.toString(),
    patientName: c.patientName,
    doctorName: c.doctorName,
    reason: c.reason,
    status: c.status,
    notes: c.notes.map((n) => ({ text: n.text, createdAt: n.createdAt.toISOString() })),
    prescriptions: c.prescriptions.map((p) => ({
      medication: p.medication,
      dosage: p.dosage,
      instructions: p.instructions,
      createdAt: p.createdAt.toISOString(),
    })),
    messages: c.messages.map((m) => ({
      senderRole: m.senderRole,
      senderName: m.senderName,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

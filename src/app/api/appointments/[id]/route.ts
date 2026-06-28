import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import type { Appointment, Consultation } from "@/lib/types";

// Doctor approves or declines an appointment. Approval spins up a consultation room.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (me.role !== "doctor") {
    return NextResponse.json({ error: "Only doctors can update appointments." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const action = (body || {}).action as "approve" | "decline" | undefined;
  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'approve' or 'decline'." }, { status: 400 });
  }

  const db = await getDb();
  const appts = db.collection<Appointment>("appointments");

  let appt: Appointment | null = null;
  try {
    appt = await appts.findOne({ _id: new ObjectId(id) });
  } catch {
    return NextResponse.json({ error: "Invalid appointment id." }, { status: 400 });
  }
  if (!appt) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  if (!appt.doctorId.equals(me._id)) {
    return NextResponse.json({ error: "Not your appointment." }, { status: 403 });
  }

  if (action === "decline") {
    await appts.updateOne({ _id: appt._id }, { $set: { status: "declined" } });
    return NextResponse.json({ status: "declined" });
  }

  // Approve → create a consultation room if one doesn't exist yet.
  let consultationId = appt.consultationId;
  if (!consultationId) {
    const consultation: Omit<Consultation, "_id"> = {
      appointmentId: appt._id,
      patientId: appt.patientId,
      doctorId: appt.doctorId,
      patientName: appt.patientName,
      doctorName: appt.doctorName,
      reason: appt.reason,
      notes: [],
      prescriptions: [],
      messages: [],
      status: "open",
      createdAt: new Date(),
    };
    const res = await db
      .collection<Consultation>("consultations")
      .insertOne(consultation as Consultation);
    consultationId = res.insertedId;
  }

  await appts.updateOne(
    { _id: appt._id },
    { $set: { status: "approved", consultationId } }
  );

  return NextResponse.json({ status: "approved", consultationId: consultationId.toString() });
}

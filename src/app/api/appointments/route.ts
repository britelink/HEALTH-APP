import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import type { Appointment, User } from "@/lib/types";

// List appointments relevant to the current user (their own as patient or doctor).
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const db = await getDb();
  const filter = me.role === "doctor" ? { doctorId: me._id } : { patientId: me._id };
  const appts = await db
    .collection<Appointment>("appointments")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    appointments: appts.map((a) => ({
      id: a._id.toString(),
      patientName: a.patientName,
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

// Patient books an appointment with a doctor.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (me.role !== "patient") {
    return NextResponse.json({ error: "Only patients can book appointments." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { doctorId, date, time, reason } = (body || {}) as {
    doctorId?: string;
    date?: string;
    time?: string;
    reason?: string;
  };

  if (!doctorId || !date || !time || !reason) {
    return NextResponse.json({ error: "Doctor, date, time and reason are required." }, { status: 400 });
  }

  const db = await getDb();
  let doctor: User | null = null;
  try {
    doctor = await db.collection<User>("users").findOne({ _id: new ObjectId(doctorId), role: "doctor" });
  } catch {
    return NextResponse.json({ error: "Invalid doctor id." }, { status: 400 });
  }
  if (!doctor) return NextResponse.json({ error: "Doctor not found." }, { status: 404 });

  const doc: Omit<Appointment, "_id"> = {
    patientId: me._id,
    doctorId: doctor._id,
    patientName: me.name,
    doctorName: doctor.name,
    specialization: doctor.specialization,
    date,
    time,
    reason,
    status: "pending",
    createdAt: new Date(),
  };

  const result = await db.collection<Appointment>("appointments").insertOne(doc as Appointment);
  return NextResponse.json({ id: result.insertedId.toString(), status: "pending" });
}

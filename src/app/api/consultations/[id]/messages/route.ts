import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { loadConsultationFor, serializeConsultation } from "@/lib/consultations";
import type { Consultation, ConsultationMessage } from "@/lib/types";

// Either participant posts a message into the consultation thread.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const consultation = await loadConsultationFor(id, me);
  if (!consultation) return NextResponse.json({ error: "Consultation not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const text = (body || {}).text as string | undefined;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Message text is required." }, { status: 400 });
  }

  const message: ConsultationMessage = {
    senderRole: me.role,
    senderName: me.name,
    text: text.trim(),
    createdAt: new Date(),
  };

  const db = await getDb();
  await db
    .collection<Consultation>("consultations")
    .updateOne({ _id: new ObjectId(id) }, { $push: { messages: message } });

  const fresh = await loadConsultationFor(id, me);
  return NextResponse.json({ consultation: fresh ? serializeConsultation(fresh) : null });
}

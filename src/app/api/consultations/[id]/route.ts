import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadConsultationFor, serializeConsultation } from "@/lib/consultations";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const consultation = await loadConsultationFor(id, me);
  if (!consultation) return NextResponse.json({ error: "Consultation not found." }, { status: 404 });

  return NextResponse.json({ consultation: serializeConsultation(consultation) });
}

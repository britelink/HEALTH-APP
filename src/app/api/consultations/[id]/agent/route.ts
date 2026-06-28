import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadConsultationFor } from "@/lib/consultations";
import { streamAgent, type AgentTurn } from "@/lib/agents";

// Role-specialised AI assistant scoped to a single consultation.
// Doctors get the "Clinical Copilot"; patients get the "Health Guide".
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const consultation = await loadConsultationFor(id, me);
  if (!consultation) return NextResponse.json({ error: "Consultation not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const { message, history } = (body || {}) as {
    message?: string;
    history?: AgentTurn[];
  };
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  const stream = streamAgent({
    role: me.role,
    consultation,
    history: Array.isArray(history) ? history.slice(-10) : [],
    userMessage: message.trim(),
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

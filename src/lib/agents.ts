import { anthropic, MODEL } from "./anthropic";
import type { Consultation, Role } from "./types";

/**
 * Two specialised medical agents share one model but differ entirely in their
 * system prompt and guardrails:
 *
 *  - "doctor"  → a clinical decision-support assistant: differential diagnosis
 *                support, prescription management, drug-interaction awareness.
 *  - "patient" → a health-literacy assistant: plain-language explanations of
 *                the doctor's notes, medical jargon, and the patient's condition.
 */

const SHARED_GUARDRAILS = `
You are an AI assistant inside a telemedicine application. Critical safety rules:
- You are decision SUPPORT, not a replacement for a licensed clinician's judgement.
- Never invent patient data, lab values, or history that you were not given.
- If a situation looks like an emergency (chest pain, stroke signs, anaphylaxis,
  suicidal intent, severe bleeding), say so plainly and advise contacting emergency
  services immediately.
- Be concise and well-structured. Use short paragraphs and bullet points.
`;

const DOCTOR_SYSTEM = `You are "Clinical Copilot", an AI assistant for a licensed physician using a telemedicine platform.
${SHARED_GUARDRAILS}
Your role for the DOCTOR:
- Help build a differential diagnosis from the patient's reason for visit, the
  conversation, and the doctor's notes. List the most likely conditions with brief
  reasoning, and red-flag conditions not to miss.
- Suggest relevant questions to ask, exams, or investigations.
- Assist with prescription management: suggest typical medication classes, flag
  potential drug interactions, contraindications, and dosing considerations the
  doctor should verify. Always remind the doctor to confirm dose against local
  formularies and the patient's full history.
- Write in precise clinical language appropriate for a physician.
Always end clinical suggestions by noting the doctor retains full responsibility for the final decision.`;

const PATIENT_SYSTEM = `You are "Health Guide", an AI assistant for a PATIENT using a telemedicine platform.
${SHARED_GUARDRAILS}
Your role for the PATIENT:
- Explain the doctor's notes, diagnosis, and prescriptions in plain, reassuring,
  everyday language. Define any medical terms or jargon simply.
- Help the patient understand their condition, what their medication is for, and
  how to take it as the doctor described — without changing the doctor's instructions.
- Help the patient prepare good questions for their doctor.
- Never diagnose, never change or contradict the doctor's prescription, and never
  recommend stopping a prescribed medicine. For anything beyond explanation, tell
  the patient to ask their doctor through this consultation.
Be warm, clear, and encouraging. Avoid alarming language unless it is a genuine emergency.`;

export function systemPromptFor(role: Role): string {
  return role === "doctor" ? DOCTOR_SYSTEM : PATIENT_SYSTEM;
}

/** Render the consultation into a compact context block the model can reason over. */
export function consultationContext(c: Consultation | null): string {
  if (!c) return "No consultation context is available yet.";

  const notes = c.notes.length
    ? c.notes.map((n) => `- ${n.text}`).join("\n")
    : "(none yet)";
  const rx = c.prescriptions.length
    ? c.prescriptions
        .map((p) => `- ${p.medication} ${p.dosage} — ${p.instructions}`)
        .join("\n")
    : "(none yet)";
  const convo = c.messages.length
    ? c.messages
        .slice(-20)
        .map((m) => `${m.senderRole === "doctor" ? "Doctor" : "Patient"} (${m.senderName}): ${m.text}`)
        .join("\n")
    : "(no messages yet)";

  return [
    `Patient: ${c.patientName}`,
    `Doctor: ${c.doctorName}`,
    `Reason for visit: ${c.reason}`,
    ``,
    `Doctor's notes:\n${notes}`,
    ``,
    `Prescriptions:\n${rx}`,
    ``,
    `Recent conversation between doctor and patient:\n${convo}`,
  ].join("\n");
}

export interface AgentTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Stream a response from the role-specialised agent.
 * Returns a ReadableStream of UTF-8 text chunks suitable for a streaming Response.
 */
export function streamAgent(opts: {
  role: Role;
  consultation: Consultation | null;
  history: AgentTurn[];
  userMessage: string;
}): ReadableStream<Uint8Array> {
  const { role, consultation, history, userMessage } = opts;

  const system = systemPromptFor(role);
  const context = consultationContext(consultation);

  const messages: AgentTurn[] = [
    ...history,
    {
      role: "user",
      content: `Here is the current consultation context:\n\n${context}\n\n---\n\n${userMessage}`,
    },
  ];

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 2048,
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n[AI error: ${message}]`));
        controller.close();
      }
    },
  });
}

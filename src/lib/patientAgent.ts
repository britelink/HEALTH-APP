import type Anthropic from "@anthropic-ai/sdk";
import { ObjectId } from "mongodb";
import { anthropic, MODEL } from "./anthropic";
import { getDb } from "./mongodb";
import type { Appointment, User } from "./types";

/**
 * Conversational booking concierge for patients. Instead of forms, the patient
 * talks to this agent, which uses tools to look up doctors, book appointments,
 * and report on existing appointments — all backed by MongoDB.
 */

const SYSTEM = `You are "Health Concierge", a warm, efficient assistant for a PATIENT in a telemedicine app.
You help the patient entirely through conversation — there are no forms.

What you can do (via your tools):
- Find doctors and their specialization and availability (list_doctors).
- Book an appointment with a doctor (book_appointment).
- Tell the patient about their existing appointments and status (list_my_appointments).

How to behave:
- To book, you need a doctor, a date (YYYY-MM-DD), a time (HH:MM, 24h), and a short reason.
  Gather whatever is missing by asking brief, friendly questions. If the patient names a
  symptom but not a doctor, call list_doctors and suggest a suitable specialty.
- Always confirm the doctor, date, time and reason back to the patient BEFORE calling
  book_appointment. After booking, tell them it's now pending the doctor's approval.
- You never diagnose or give treatment advice. For medical concerns, explain that the doctor
  will help during the consultation. If something sounds like an emergency (chest pain, stroke
  signs, severe bleeding, suicidal thoughts), tell them to contact emergency services now.
- Keep replies short and clear. Use the patient's own words for the reason for visit.
- When you reference a doctor in a tool call, use the exact doctorId from list_doctors.`;

const tools: Anthropic.Tool[] = [
  {
    name: "list_doctors",
    description: "List all available doctors with their id, name, specialization, bio and availability.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_my_appointments",
    description: "List the current patient's appointments with their status (pending/approved/declined).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "book_appointment",
    description:
      "Book an appointment for the patient with a specific doctor. Confirm the details with the patient first.",
    input_schema: {
      type: "object",
      properties: {
        doctorId: { type: "string", description: "The exact id of the doctor from list_doctors." },
        date: { type: "string", description: "Appointment date, formatted YYYY-MM-DD." },
        time: { type: "string", description: "Appointment time, 24h HH:MM." },
        reason: { type: "string", description: "Short reason for the visit, in the patient's words." },
      },
      required: ["doctorId", "date", "time", "reason"],
    },
  },
];

async function executeTool(name: string, input: Record<string, unknown>, patient: User): Promise<string> {
  const db = await getDb();

  if (name === "list_doctors") {
    const doctors = await db.collection<User>("users").find({ role: "doctor" }).toArray();
    return JSON.stringify(
      doctors.map((d) => ({
        doctorId: d._id.toString(),
        name: d.name,
        specialization: d.specialization || "General",
        bio: d.bio || "",
        availability: (d.availability || []).map((s) => `${s.day} ${s.start}-${s.end}`),
      }))
    );
  }

  if (name === "list_my_appointments") {
    const appts = await db
      .collection<Appointment>("appointments")
      .find({ patientId: patient._id })
      .sort({ createdAt: -1 })
      .toArray();
    return JSON.stringify(
      appts.map((a) => ({
        doctor: a.doctorName,
        specialization: a.specialization,
        date: a.date,
        time: a.time,
        reason: a.reason,
        status: a.status,
      }))
    );
  }

  if (name === "book_appointment") {
    const { doctorId, date, time, reason } = input as {
      doctorId?: string;
      date?: string;
      time?: string;
      reason?: string;
    };
    if (!doctorId || !date || !time || !reason) {
      return "Error: doctorId, date, time and reason are all required to book.";
    }
    let doctor: User | null = null;
    try {
      doctor = await db.collection<User>("users").findOne({ _id: new ObjectId(doctorId), role: "doctor" });
    } catch {
      return "Error: that doctorId is not valid. Call list_doctors to get valid ids.";
    }
    if (!doctor) return "Error: no doctor found with that id.";

    const doc: Omit<Appointment, "_id"> = {
      patientId: patient._id,
      doctorId: doctor._id,
      patientName: patient.name,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      date,
      time,
      reason,
      status: "pending",
      createdAt: new Date(),
    };
    await db.collection<Appointment>("appointments").insertOne(doc as Appointment);
    return JSON.stringify({
      ok: true,
      message: `Appointment requested with Dr. ${doctor.name} (${doctor.specialization}) on ${date} at ${time}. It is now pending the doctor's approval.`,
    });
  }

  return `Error: unknown tool "${name}".`;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Run one conversational turn. The tool_use/tool_result exchange happens
 * server-side within this turn; only text is kept in the client-side history.
 */
export async function runPatientAgent(opts: {
  patient: User;
  history: ChatTurn[];
  message: string;
}): Promise<string> {
  const { patient, history, message } = opts;

  // The Messages API requires the first turn to be a user turn, but the client
  // history begins with the concierge's greeting — drop any leading assistant turns.
  const cleaned = [...history];
  while (cleaned.length && cleaned[0].role === "assistant") cleaned.shift();

  const messages: Anthropic.MessageParam[] = [
    ...cleaned.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: message },
  ];

  // Agentic loop: keep resolving tool calls until the model produces a final answer.
  for (let i = 0; i < 6; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
    }

    // Execute every requested tool, then feed the results back.
    messages.push({ role: "assistant", content: response.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await executeTool(
          block.name,
          (block.input || {}) as Record<string, unknown>,
          patient
        );
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "I'm having trouble completing that right now. Could you rephrase or try again?";
}

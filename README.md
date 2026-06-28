# HEALTH-APP

An AI-driven telemedicine application. Patients book appointments with doctors based on
availability; doctors approve or decline; approved appointments open a **virtual consultation
room** where the doctor takes notes and prescribes, the patient reads everything and replies,
and a **role-specialized AI agent** assists both sides.

- **AI / LLM:** Anthropic Claude (`claude-opus-4-8`) via `@anthropic-ai/sdk`, streaming.
- **Framework:** Next.js (App Router).
- **Database:** MongoDB.

## Two specialized agents

The same model is given two completely different personas, system prompts, and guardrails:

| Agent | For | Helps with |
|-------|-----|-----------|
| **Clinical Copilot** | Doctors | Differential diagnosis support, investigations, prescription & drug-interaction management |
| **Health Guide** | Patients | Plain-language explanations of notes, diagnosis, prescriptions, and medical jargon |

Both are scoped to a single consultation and reason over its notes, prescriptions, and chat.
They are framed as decision support, never a replacement for a clinician.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env.local` and fill in:

   ```
   MONGODB_URI=...        # MongoDB Atlas or local instance
   ANTHROPIC_API_KEY=...  # https://console.anthropic.com/
   AUTH_SECRET=...        # any long random string
   ```

3. **Run**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Flow

1. Register as a **Patient** or a **Doctor** (doctors set a specialization).
2. A patient picks a doctor, sees availability, and requests an appointment.
3. The doctor approves or declines. Approval creates a consultation room.
4. In the room: doctor adds clinical notes & prescriptions; both exchange messages; each side
   has its own AI assistant.

## Project structure

```
src/
  lib/        mongodb, auth (JWT cookie + bcrypt), anthropic client, agents, consultations
  app/
    api/      auth, doctors, appointments, consultations (notes, messages, AI agent)
    login, register, dashboard, consultation/[id]
  components/ Topbar, Patient/Doctor dashboards, ConsultationRoom
```

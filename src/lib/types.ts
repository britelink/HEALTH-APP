import { ObjectId } from "mongodb";

export type Role = "patient" | "doctor";

export interface AvailabilitySlot {
  day: string; // e.g. "Monday"
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface User {
  _id: ObjectId;
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  role: Role;
  // doctor-only
  specialization?: string;
  bio?: string;
  availability?: AvailabilitySlot[];
  createdAt: Date;
}

export type AppointmentStatus = "pending" | "approved" | "declined";

export interface Appointment {
  _id: ObjectId;
  patientId: ObjectId;
  doctorId: ObjectId;
  patientName: string;
  doctorName: string;
  specialization?: string;
  date: string; // "2026-07-01"
  time: string; // "10:30"
  reason: string;
  status: AppointmentStatus;
  consultationId?: ObjectId;
  createdAt: Date;
}

export interface Prescription {
  medication: string;
  dosage: string;
  instructions: string;
  createdAt: Date;
}

export interface ConsultationNote {
  text: string;
  createdAt: Date;
}

export interface ConsultationMessage {
  senderRole: Role;
  senderName: string;
  text: string;
  createdAt: Date;
}

export type ConsultationStatus = "open" | "closed";

export interface Consultation {
  _id: ObjectId;
  appointmentId: ObjectId;
  patientId: ObjectId;
  doctorId: ObjectId;
  patientName: string;
  doctorName: string;
  reason: string;
  notes: ConsultationNote[];
  prescriptions: Prescription[];
  messages: ConsultationMessage[];
  status: ConsultationStatus;
  createdAt: Date;
}

/** The shape we expose to the client (never the password hash). */
export interface SafeUser {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  specialization?: string;
  bio?: string;
  availability?: AvailabilitySlot[];
}

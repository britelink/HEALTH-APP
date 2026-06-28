import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";

// List all doctors with their specialization and availability so patients can book.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const db = await getDb();
  const doctors = await db
    .collection<User>("users")
    .find({ role: "doctor" })
    .toArray();

  return NextResponse.json({
    doctors: doctors.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      specialization: d.specialization || "General",
      bio: d.bio || "",
      availability: d.availability || [],
    })),
  });
}

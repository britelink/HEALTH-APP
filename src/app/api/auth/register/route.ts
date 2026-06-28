import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, createSession, toSafeUser } from "@/lib/auth";
import type { User, AvailabilitySlot, Role } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const { email, username, name, password, role, specialization, bio, availability } = body as {
    email?: string;
    username?: string;
    name?: string;
    password?: string;
    role?: Role;
    specialization?: string;
    bio?: string;
    availability?: AvailabilitySlot[];
  };

  if (!email || !username || !name || !password || !role) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (role !== "patient" && role !== "doctor") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (role === "doctor" && !specialization) {
    return NextResponse.json({ error: "Doctors must provide a specialization." }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection<User>("users");

  const existing = await users.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });
  if (existing) {
    return NextResponse.json({ error: "Email or username already in use." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const doc: Omit<User, "_id"> = {
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    name,
    passwordHash,
    role,
    createdAt: new Date(),
    ...(role === "doctor"
      ? { specialization, bio: bio || "", availability: availability || [] }
      : {}),
  };

  const result = await users.insertOne(doc as User);
  await createSession(result.insertedId.toString());

  return NextResponse.json({
    user: toSafeUser({ ...(doc as User), _id: result.insertedId }),
  });
}

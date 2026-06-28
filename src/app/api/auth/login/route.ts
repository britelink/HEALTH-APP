import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyPassword, createSession, toSafeUser } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const { identifier, password } = body as { identifier?: string; password?: string };
  if (!identifier || !password) {
    return NextResponse.json({ error: "Email/username and password are required." }, { status: 400 });
  }

  const db = await getDb();
  const id = identifier.toLowerCase();
  const user = await db
    .collection<User>("users")
    .findOne({ $or: [{ email: id }, { username: id }] });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  await createSession(user._id.toString());
  return NextResponse.json({ user: toSafeUser(user) });
}

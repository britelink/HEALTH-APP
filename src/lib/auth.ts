import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { SafeUser, User } from "./types";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "insecure-dev-secret-change-me"
);
const COOKIE_NAME = "health_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    specialization: user.specialization,
    bio: user.bio,
    availability: user.availability,
  };
}

/** Returns the full DB user for the current session, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.sub;
    if (!userId || typeof userId !== "string") return null;

    const db = await getDb();
    const user = await db
      .collection<User>("users")
      .findOne({ _id: new ObjectId(userId) });
    return user;
  } catch {
    return null;
  }
}

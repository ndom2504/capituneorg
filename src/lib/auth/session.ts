import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

const COOKIE_NAME = "capitune_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

function secretKey() {
  const secret = process.env.CAPITUNE_AUTH_SECRET ?? "capitune-dev-secret";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + MAX_AGE_SECONDS)
    .sign(secretKey());
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = payload.sub;
    if (typeof sub !== "string" || !sub) return null;
    return sub;
  } catch {
    return null;
  }
}

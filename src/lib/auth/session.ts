import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

const COOKIE_NAME = "capitune_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

function cookieDomain(): string | undefined {
  const v = (process.env.CAPITUNE_COOKIE_DOMAIN ?? "").trim();
  return v ? v : undefined;
}

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
    domain: cookieDomain(),
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
    domain: cookieDomain(),
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

    // Server-side checks: suspended/deleted users, and forced logout.
    // Note: this intentionally hits the DB so the server can invalidate sessions.
    try {
      const { prisma } = await import("@/lib/db");
      const user = await prisma.user.findUnique({
        where: { id: sub },
        select: { accountStatus: true, sessionInvalidBefore: true },
      });
      if (!user) return null;
      if (user.accountStatus === "SUSPENDED" || user.accountStatus === "DELETED") return null;

      const iat = typeof payload.iat === "number" ? payload.iat : null;
      if (iat && user.sessionInvalidBefore) {
        const invalidBeforeSec = Math.floor(user.sessionInvalidBefore.getTime() / 1000);
        if (iat < invalidBeforeSec) return null;
      }
    } catch {
      // If DB is unavailable, fail closed for authenticated routes.
      return null;
    }

    return sub;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  
  const { prisma } = await import("@/lib/db");
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      accountType: true,
      adminRole: true,
      accountStatus: true,
      avatarUrl: true,
    },
  });
}

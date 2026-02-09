import { SignJWT, jwtVerify } from "jose";

const PURPOSE = "pro_verification_upload_v1";
const MAX_AGE_SECONDS = 60 * 15; // 15 minutes

function secretKey() {
  const secret = process.env.CAPITUNE_AUTH_SECRET ?? "capitune-dev-secret";
  return new TextEncoder().encode(secret);
}

export async function createProVerificationUploadToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: userId, purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + MAX_AGE_SECONDS)
    .sign(secretKey());
}

export async function verifyProVerificationUploadToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey());

  const sub = payload.sub;
  if (typeof sub !== "string" || !sub) throw new Error("Token invalide.");

  const purpose = (payload as { purpose?: unknown }).purpose;
  if (purpose !== PURPOSE) throw new Error("Token invalide.");

  return { userId: sub };
}

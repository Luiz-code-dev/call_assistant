import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  plan: string;
  iat?: number;
  exp?: number;
}

export async function signToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getCookieDomain(host: string): string | undefined {
  if (host.includes("speakf.com.br")) return ".speakf.com.br";
  return undefined;
}

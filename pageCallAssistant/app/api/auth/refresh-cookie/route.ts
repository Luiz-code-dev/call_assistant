import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getCookieDomain } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "no_token" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const host = req.headers.get("host") ?? "";
  const isProd = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true });

  response.cookies.set("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    domain: getCookieDomain(host),
  });

  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { getCookieDomain } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") ?? "www.speakf.com.br";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;
  const response = NextResponse.redirect(`${baseUrl}/login`);
  const isProd = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  };
  response.cookies.set("token", "", cookieOpts);
  response.cookies.set("token", "", { ...cookieOpts, domain: getCookieDomain(host) });
  return response;
}

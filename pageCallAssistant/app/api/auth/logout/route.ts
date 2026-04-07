import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") ?? "www.speakf.com.br";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;
  const response = NextResponse.redirect(`${baseUrl}/login`);
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
    domain: isProd ? ".speakf.com.br" : undefined,
  });
  return response;
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") ?? "www.call-assistant.com.br";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;
  const response = NextResponse.redirect(`${baseUrl}/login`);
  response.cookies.delete("token");
  return response;
}

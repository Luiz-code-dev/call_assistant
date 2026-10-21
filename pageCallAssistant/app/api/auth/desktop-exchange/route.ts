import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "no-store",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

export async function POST(req: NextRequest) {
  const hdrs = corsHeaders(req);
  console.log("DESKTOP_EXCHANGE_DEBUG", {
    origin: req.headers.get("origin"),
    hasContentType: !!req.headers.get("content-type"),
    hasJwtSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET?.length,
  });
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ message: "Token is required" }, { status: 400, headers: hdrs });
    }

    // Verify the short-lived transport token
    let payload: { sub?: string; email?: string; name?: string; plan?: string; type?: string };
    try {
      const result = await jwtVerify(token, secret);
      payload = result.payload as typeof payload;
    } catch (verifyErr) {
      console.error("DESKTOP_EXCHANGE_VERIFY_FAILED", { error: verifyErr instanceof Error ? verifyErr.message : String(verifyErr) });
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401, headers: hdrs });
    }

    // Must be a desktop transport token
    if (payload.type !== "desktop") {
      console.error("DESKTOP_EXCHANGE_WRONG_TYPE", { type: payload.type });
      return NextResponse.json({ message: "Invalid token type" }, { status: 401, headers: hdrs });
    }

    if (!payload.sub) {
      return NextResponse.json({ message: "Token missing subject" }, { status: 401, headers: hdrs });
    }

    // Issue a long-lived desktop session token (30 days)
    const sessionToken = await new SignJWT({
      sub: payload.sub,
      email: payload.email ?? "",
      name: payload.name ?? "",
      plan: payload.plan ?? "free",
      type: "desktop-session",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    console.log("DESKTOP_EXCHANGE_SUCCESS", { sub: payload.sub });
    return NextResponse.json({ token: sessionToken }, { headers: hdrs });
  } catch (err) {
    console.error("DESKTOP_EXCHANGE_ERROR", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ message: "Internal server error" }, { status: 500, headers: hdrs });
  }
}

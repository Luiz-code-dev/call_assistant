import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ message: "Token is required" }, { status: 400 });
    }

    // Verify the short-lived transport token
    let payload: { sub?: string; email?: string; name?: string; plan?: string; type?: string };
    try {
      const result = await jwtVerify(token, secret);
      payload = result.payload as typeof payload;
    } catch {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }

    // Must be a desktop transport token
    if (payload.type !== "desktop") {
      return NextResponse.json({ message: "Invalid token type" }, { status: 401 });
    }

    if (!payload.sub) {
      return NextResponse.json({ message: "Token missing subject" }, { status: 401 });
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

    return NextResponse.json({ token: sessionToken });
  } catch {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

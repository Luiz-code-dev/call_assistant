import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const protectedRoutes = ["/dashboard", "/settings", "/usage"];
const authRoutes = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";

  if (host === "speakf.com.br" || proto === "http") {
    const url = new URL(req.url);
    url.protocol = "https:";
    url.host = "www.speakf.com.br";
    return NextResponse.redirect(url.toString(), 301);
  }

  const rawToken = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  let validToken = false;
  if (rawToken) {
    try {
      await jwtVerify(rawToken, secret);
      validToken = true;
    } catch {
      validToken = false;
    }
  }

  if (isProtected && !validToken) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    if (rawToken) res.cookies.delete("token");
    return res;
  }

  if (isAuthRoute && validToken) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

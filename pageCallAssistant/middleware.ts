import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const protectedRoutes = ["/dashboard", "/settings", "/usage", "/tools", "/live", "/home", "/progress", "/support", "/friends", "/messages", "/feed", "/profile", "/teams", "/onboarding", "/chat"];
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

  const { pathname } = req.nextUrl;

  // ── Área Escolar ── isolado, não altera lógica existente ──────────
  if (pathname.startsWith("/escola") || pathname.startsWith("/verificar")) {
    if (process.env.FEATURE_ESCOLAS !== "true") {
      return NextResponse.next();
    }

    const eduSecret = new TextEncoder().encode(
      process.env.EDU_STUDENT_JWT_SECRET || "edu-student-dev-secret"
    );

    if (
      pathname.startsWith("/escola/entrar") ||
      pathname.startsWith("/verificar")
    ) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/escola/aluno")) {
      const studentToken = req.cookies.get("sf_edu_student")?.value;
      if (!studentToken) {
        return NextResponse.redirect(new URL("/escola/entrar", req.url));
      }
      try {
        await jwtVerify(studentToken, eduSecret);
        return NextResponse.next();
      } catch {
        const res = NextResponse.redirect(new URL("/escola/entrar", req.url));
        res.cookies.delete("sf_edu_student");
        return res;
      }
    }

    const ctxToken = req.cookies.get("sf_edu_ctx")?.value;
    if (!ctxToken) {
      return NextResponse.redirect(new URL("/escola/entrar", req.url));
    }
    try {
      await jwtVerify(ctxToken, eduSecret);
      return NextResponse.next();
    } catch {
      const res = NextResponse.redirect(new URL("/escola/entrar", req.url));
      res.cookies.delete("sf_edu_ctx");
      return res;
    }
  }
  // ── fim Área Escolar ──────────────────────────────────────────────

  const rawToken = req.cookies.get("token")?.value;

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
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    const res = NextResponse.redirect(loginUrl);
    if (rawToken) res.cookies.delete("token");
    return res;
  }

  if (isAuthRoute && validToken) {
    const callback = req.nextUrl.searchParams.get("callback");
    if (callback === "desktop") {
      return NextResponse.redirect(new URL("/auth/desktop", req.url));
    }
    return NextResponse.redirect(new URL("/home", req.url));
  }

  if (pathname === "/" && validToken) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

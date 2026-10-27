import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Atras do proxy (Railway), req.url tem o host interno (0.0.0.0:3000).
  // Monta a URL publica pelos headers encaminhados; 303 para o POST virar GET.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const base = host ? `${proto}://${host}` : new URL(req.url).origin;
  const res = NextResponse.redirect(`${base}/escola/familia/entrar`, 303);
  res.cookies.delete("sf_family_ctx");
  return res;
}

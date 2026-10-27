import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Redireciona relativo à origem da requisição (nunca hardcode localhost).
  const res = NextResponse.redirect(new URL("/escola/familia/entrar", req.url));
  res.cookies.delete("sf_family_ctx");
  return res;
}

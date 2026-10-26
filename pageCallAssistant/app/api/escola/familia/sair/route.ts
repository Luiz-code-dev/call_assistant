import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.redirect(new URL("/escola/familia/entrar", "http://localhost"));
  res.cookies.delete("sf_family_ctx");
  return res;
}

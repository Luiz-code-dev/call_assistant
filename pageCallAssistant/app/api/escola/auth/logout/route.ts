import { NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function POST() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete("sf_edu_ctx");
  res.cookies.delete("sf_edu_student");
  return res;
}

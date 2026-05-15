import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin, ROOT_ADMIN_EMAIL } from "@/lib/superAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ rootEmail: ROOT_ADMIN_EMAIL || null });
}

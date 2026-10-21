import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ b2bAccess: false }, { status: 401 });

  const user = await (db as any).user.findUnique({
    where: { id: session.sub },
    select: { b2bAccess: true },
  });

  return NextResponse.json({ b2bAccess: user?.b2bAccess ?? false });
}

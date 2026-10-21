import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCrmUser } from "@/lib/crmAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isCrmUser(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const plan    = searchParams.get("plan") ?? "all";
  const search  = searchParams.get("q") ?? "";
  const b2b     = searchParams.get("b2b") === "1";
  const limit   = Math.min(parseInt(searchParams.get("limit") ?? "100"), 300);
  const offset  = parseInt(searchParams.get("offset") ?? "0");

  const where: any = {};
  if (plan !== "all") where.plan = plan;
  if (b2b) where.b2bAccess = true;
  if (search) {
    where.OR = [
      { name:  { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    (db as any).user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true, name: true, email: true, plan: true, credits: true,
        b2bAccess: true, superAdmin: true, crmAccess: true,
        createdAt: true, avatarUrl: true,
        _count: { select: { orgMemberships: true } },
      },
    }),
    (db as any).user.count({ where }),
  ]);

  return NextResponse.json({ users, total });
}

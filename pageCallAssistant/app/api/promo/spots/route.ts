import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PROMO_TOTAL = 300;

export async function GET() {
  try {
    const claimed = await (db as any).creditTransaction.count({
      where: { source: "launch_promo" },
    });
    const remaining = Math.max(0, PROMO_TOTAL - claimed);
    return NextResponse.json({ remaining, claimed, total: PROMO_TOTAL });
  } catch {
    return NextResponse.json({ remaining: PROMO_TOTAL, claimed: 0, total: PROMO_TOTAL });
  }
}

import { NextRequest, NextResponse } from "next/server";

// GET /api/cron/challenge-notifications?secret=CRON_SECRET
// Fallback HTTP trigger (the app also auto-runs crons via instrumentation.ts).
// The actual logic lives in lib/cron-runner.ts to avoid duplication.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { startCronJobs } = await import("@/lib/cron-runner");
  startCronJobs();

  return NextResponse.json({ ok: true, message: "cron jobs running via instrumentation", checkedAt: new Date().toISOString() });
}

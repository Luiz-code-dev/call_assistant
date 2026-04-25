import { NextRequest, NextResponse } from "next/server";
import { getToolSession } from "@/app/api/tools/_auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getToolSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const session_id = body?.session_id as string | undefined;
  if (!session_id) {
    return NextResponse.json({ error: "session_id obrigatório." }, { status: 400 });
  }

  const copilotUrl = process.env.COPILOT_SERVICE_URL;
  if (copilotUrl) {
    try {
      await fetch(`${copilotUrl}/copilot/session/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: `live_${session.sub}_${session_id}` }),
      });
    } catch (err) {
      console.warn("[api/live/session/end] Failed to clear copilot session:", err);
    }
  }

  return NextResponse.json({ ok: true });
}

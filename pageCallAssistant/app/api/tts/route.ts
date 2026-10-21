import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getNetworkSession } from "@/app/api/network/_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "tts_unavailable" }, { status: 503 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { text, speed } = await req.json().catch(() => ({}));
  if (!text || typeof text !== "string" || text.length > 500)
    return NextResponse.json({ error: "invalid_text" }, { status: 400 });

  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: text,
    speed: typeof speed === "number" && speed >= 0.25 && speed <= 4.0 ? speed : 0.85,
  });

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

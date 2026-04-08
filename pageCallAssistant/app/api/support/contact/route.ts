import { NextRequest, NextResponse } from "next/server";
import { sendSupportEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, question } = body ?? {};

    if (!name?.trim() || !email?.trim() || !question?.trim()) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    await sendSupportEmail(name.trim(), email.trim(), question.trim());

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[support/contact]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

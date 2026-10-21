import { NextRequest, NextResponse } from "next/server";
import { sendSupportEmail } from "@/lib/email";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, question } = body ?? {};

    if (!name?.trim() || !email?.trim() || !question?.trim()) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const n = name.trim();
    const e = email.trim();
    const q = question.trim();

    const saved = await db.supportMessage.create({
      data: { name: n, email: e, message: q },
    }).catch((dbErr: unknown) => {
      console.error("[support/contact] DB save failed:", dbErr);
      return null;
    });

    const emailSent = await sendSupportEmail(n, e, q);

    if (saved && emailSent) {
      await db.supportMessage.update({
        where: { id: saved.id },
        data: { emailSent: true },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[support/contact]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

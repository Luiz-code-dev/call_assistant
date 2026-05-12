import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, role, teamSize, message } = await req.json();

    if (!name || !email || !company) {
      return NextResponse.json({ error: "Nome, e-mail e empresa são obrigatórios." }, { status: 400 });
    }

    await (db as any).supportMessage.create({
      data: {
        name,
        email,
        message: `[B2B LEAD]\nEmpresa: ${company}\nCargo: ${role ?? "—"}\nTamanho do time: ${teamSize ?? "—"}\n\n${message ?? "Solicitou demonstração."}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[b2b-contact]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

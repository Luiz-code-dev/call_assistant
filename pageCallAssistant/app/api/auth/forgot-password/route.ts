import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "E-mail é obrigatório" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
    const res = await fetch(`${backendUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // Always return 200 to avoid user enumeration
    if (!res.ok && res.status !== 404) {
      return NextResponse.json({ message: "Erro ao processar solicitação" }, { status: 500 });
    }

    return NextResponse.json({ message: "Se este e-mail estiver cadastrado, você receberá um link em breve." });
  } catch {
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}

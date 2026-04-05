import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: "Token e senha são obrigatórios" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: "Senha deve ter mínimo 8 caracteres" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
    const res = await fetch(`${backendUrl}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ message: data.message || "Token inválido ou expirado" }, { status: res.status });
    }

    return NextResponse.json({ message: "Senha redefinida com sucesso" });
  } catch {
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}

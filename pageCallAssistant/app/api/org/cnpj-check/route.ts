import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cnpj = req.nextUrl.searchParams.get("cnpj")?.replace(/\D/g, "") ?? "";
  if (cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ deve ter 14 dígitos." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { "User-Agent": "SpeakFlow/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      return NextResponse.json({ valid: false, error: "CNPJ não encontrado na Receita Federal." }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ valid: false, error: "Erro ao consultar Receita Federal." }, { status: 502 });
    }

    const data = await res.json();
    const situacao: string = (data.descricao_situacao_cadastral ?? "").toUpperCase();
    const active = situacao === "ATIVA";

    return NextResponse.json({
      valid: true,
      active,
      razaoSocial: data.razao_social ?? "",
      situacao,
      cnpj,
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Timeout ao consultar Receita Federal." }, { status: 504 });
  }
}

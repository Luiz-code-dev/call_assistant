import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { generateTemplate } from "@/lib/escola/import/parser";

function flag() { return isEscolasEnabled(); }

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const tipo = (searchParams.get("tipo") ?? "STUDENTS").toUpperCase() as "SCHOOLS" | "STAFF" | "STUDENTS" | "ASSIGNMENTS";
  const csv = generateTemplate(tipo);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="modelo-${tipo.toLowerCase()}.csv"`,
    },
  });
}

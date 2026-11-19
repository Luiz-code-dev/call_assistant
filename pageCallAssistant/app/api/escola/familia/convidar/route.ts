/**
 * POST /api/escola/familia/convidar
 * Convida um responsável para acompanhar um aluno, a partir do e-mail.
 *
 * É um atalho para POST /api/escola/alunos/[id]/responsaveis, que é quem cria o
 * responsável, o vínculo e o convite (e envia o e-mail). Esta rota gravava campos que
 * não existem no vínculo (inviteToken, status) e sempre falhava.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { POST as vincularResponsavel } from "@/app/api/escola/alunos/[id]/responsaveis/route";

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { studentId, email, name, relation } = await req.json().catch(() => ({}));
  const emailN = typeof email === "string" ? email.trim() : "";
  if (!studentId || !emailN) return NextResponse.json({ error: "Informe o aluno e o e-mail do responsável." }, { status: 400 });

  const interno = new NextRequest(new URL(`/api/escola/alunos/${studentId}/responsaveis`, req.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: (typeof name === "string" && name.trim()) || emailN.split("@")[0],
      relation: relation || "OUTRO",
      email: emailN,
    }),
  });
  return vincularResponsavel(interno, { params: { id: String(studentId) } });
}

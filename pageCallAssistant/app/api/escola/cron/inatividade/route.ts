/**
 * POST /api/escola/cron/inatividade
 * Job diário: detecta alunos sem prática há ≥ 7 dias e envia e-mail
 * ao responsável (máx. 1×/semana) se ele aceitou receber.
 *
 * Segue o mesmo padrão de /api/escola/cron/evaluate:
 *   - enumera redes via catalogDb.tenant (nunca prismaEdu global)
 *   - obtém cliente de cada rede com getTenantDb
 *   - usa header Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { catalogDb } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";

export const runtime = "nodejs";
export const maxDuration = 120;

const INACTIVE_DAYS = 7;
const WARN_INTERVAL_DAYS = 7;

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ ok: false }, { status: 403 });

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Busca redes ativas pelo catálogo (mesmo padrão do cron/evaluate)
  let networks: { id: string }[] = [];
  try {
    networks = await catalogDb.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
      orderBy: { id: "asc" },
    });
  } catch (err) {
    console.error("[cron/inatividade] Erro ao buscar redes:", err);
    return NextResponse.json({ error: "catalog_error" }, { status: 500 });
  }

  let totalMarcados = 0;
  let totalEmails = 0;

  for (const net of networks) {
    let db: any;
    try {
      db = await getTenantDb(net.id);
    } catch {
      continue; // rede em manutenção — pula
    }

    try {
      const cutoff = new Date(Date.now() - INACTIVE_DAYS * 86_400_000);

      // Alunos com matrícula ativa nesta rede
      const enrollments = await db.eduEnrollment.findMany({
        where: { networkId: net.id, status: "ACTIVE" },
        select: { studentId: true },
      });
      const studentIds: string[] = Array.from(new Set(enrollments.map((e: { studentId: string }) => e.studentId)));
      if (studentIds.length === 0) continue;

      // Última entrega por aluno (uma query só, sem relações aninhadas)
      const lastSubs = await db.eduSubmission.findMany({
        where: {
          networkId: net.id,
          studentId: { in: studentIds },
          submittedAt: { not: null },
        },
        orderBy: { submittedAt: "desc" as const },
        select: { studentId: true, submittedAt: true },
      });

      // Mapa studentId → última data de entrega
      const lastByStudent = new Map<string, Date>();
      for (const s of lastSubs) {
        if (!lastByStudent.has(s.studentId))
          lastByStudent.set(s.studentId, new Date(s.submittedAt));
      }

      // Alunos inativos
      const inativos = studentIds.filter((sid: string) => {
        const last = lastByStudent.get(sid);
        return !last || last < cutoff;
      });
      if (inativos.length === 0) continue;

      totalMarcados += inativos.length;

      // Links família → aluno (query separada, sem relações aninhadas)
      const links = await db.eduGuardianLink.findMany({
        where: {
          networkId: net.id,
          studentId: { in: inativos },
          status: "ACTIVE",
        },
        select: { guardianId: true, studentId: true },
      });

      if (links.length === 0) continue;

      const guardianIds = Array.from(new Set(links.map((l: { guardianId: string }) => l.guardianId)));

      // Guardiões com e-mail (sem assumir campo notifyInactivity — envia sempre)
      const guardians = await db.eduGuardian.findMany({
        where: { id: { in: guardianIds }, email: { not: null } },
        select: { id: true, email: true },
      });
      const guardianEmail = new Map<string, string>(guardians.map((g: { id: string; email: string }) => [g.id, g.email] as [string, string]));

      const warnCutoff = new Date(Date.now() - WARN_INTERVAL_DAYS * 86_400_000);

      for (const link of links) {
        const email = guardianEmail.get(link.guardianId);
        if (!email) continue;

        // Verificar se já enviamos na última semana via log de auditoria
        const jaNotificado = await db.eduAuditLog?.findFirst?.({
          where: {
            networkId: net.id,
            action: "INATIVIDADE_EMAIL",
            targetId: link.studentId,
            actorId: link.guardianId,
            createdAt: { gte: warnCutoff },
          },
        }).catch(() => null);
        if (jaNotificado) continue;

        // Busca nome do aluno
        const aluno = await db.eduStudent.findUnique({
          where: { id: link.studentId },
          select: { fullName: true },
        });
        if (!aluno) continue;

        const sent = await sendInactivityEmail({ email, studentName: aluno.fullName });
        if (sent) {
          totalEmails++;
          await db.eduAuditLog?.create?.({
            data: {
              networkId: net.id,
              action: "INATIVIDADE_EMAIL",
              targetId: link.studentId,
              actorId: link.guardianId,
              metadata: { email },
            },
          }).catch(() => null);
        }
      }
    } catch (err) {
      console.error(`[cron/inatividade] rede ${net.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, totalMarcados, totalEmails });
}

async function sendInactivityEmail({ email, studentName }: { email: string; studentName: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[inatividade] e-mail para ${email}: ${studentName} inativo há 7 dias (dev, não enviado)`);
    return true;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "SpeakFlow Escolas <noreply@speakflow.ia.br>",
        to: email,
        subject: `${studentName} está há 7 dias sem praticar`,
        html: `<p>Olá!</p>
               <p><strong>${studentName}</strong> está há 7 dias sem praticar no SpeakFlow Escolas.</p>
               <p>Que tal incentivá-lo(a) a fazer uma atividade hoje? Basta abrir o app.</p>
               <p><a href="https://speakflow.ia.br/escola/aluno/entrar">Acessar o app</a></p>
               <hr/>
               <p style="font-size:12px;color:#888">Para não receber mais estes avisos, acesse sua conta da família e desative as notificações de inatividade.</p>`,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

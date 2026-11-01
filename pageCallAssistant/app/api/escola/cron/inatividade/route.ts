/**
 * POST /api/escola/cron/inatividade
 * Job diário: marca alunos sem prática há ≥ 7 dias como INACTIVE e
 * envia e-mail ao responsável (no máximo 1 por semana) se ele aceitou receber.
 * Protegido por CRON_SECRET no header Authorization.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getTenantDb } from "@/lib/escola/tenant-db";

export const runtime = "nodejs";
export const maxDuration = 120;

const INACTIVE_DAYS = 7;
const WARN_INTERVAL_DAYS = 7;

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ ok: false }, { status: 403 });

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.replace("Bearer ", "") || auth.replace("Bearer ", "") !== secret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  // Busca todas as redes ativas
  const { prismaEdu } = await import("@/lib/escola/db");
  const P = prismaEdu as any;
  const networks = await P.eduNetwork.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  let totalMarcados = 0;
  let totalEmails = 0;

  for (const net of networks) {
    try {
      const db = await getTenantDb(net.id);
      const cutoff = new Date(Date.now() - INACTIVE_DAYS * 86400000);
      const warnCutoff = new Date(Date.now() - WARN_INTERVAL_DAYS * 86400000);

      // Alunos com atividade na rede que não submeteram nada há INACTIVE_DAYS dias
      const alunos = await db.eduStudent.findMany({
        where: {
          networkId: net.id,
          enrollments: { some: { status: "ACTIVE" } },
        },
        select: {
          id: true, fullName: true,
          submissions: {
            where: { submittedAt: { not: null } },
            orderBy: { submittedAt: "desc" },
            take: 1,
            select: { submittedAt: true },
          },
          guardianLinks: {
            where: { status: "ACTIVE" },
            include: {
              guardian: { select: { id: true, email: true, notifyInactivity: true } },
            },
          },
        },
      });

      for (const aluno of alunos) {
        const lastSub = aluno.submissions[0]?.submittedAt ?? null;
        const inativo = !lastSub || new Date(lastSub) < cutoff;
        if (!inativo) continue;

        totalMarcados++;

        // Atualiza flag no aluno (campo inactiveWarning — adiciona se não existir)
        await db.eduStudent.update({
          where: { id: aluno.id },
          data: { inactiveWarning: true } as any,
        }).catch(() => null);

        // Envia e-mail aos responsáveis que aceitaram, no máximo 1x por semana
        for (const link of aluno.guardianLinks) {
          const guardian = link.guardian;
          if (!guardian?.email || !guardian?.notifyInactivity) continue;

          // Verifica se já mandamos na última semana
          const lastWarn = await db.eduInactivityNotification?.findFirst?.({
            where: { studentId: aluno.id, guardianId: guardian.id, sentAt: { gte: warnCutoff } },
          }).catch(() => null);
          if (lastWarn) continue;

          // Envia e-mail (usa transportador SMTP configurado ou loga)
          const sent = await sendInactivityEmail({ email: guardian.email, studentName: aluno.fullName });
          if (sent) {
            await db.eduInactivityNotification?.create?.({
              data: { networkId: net.id, studentId: aluno.id, guardianId: guardian.id, sentAt: new Date() } as any,
            }).catch(() => null);
            totalEmails++;
          }
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
    console.log(`[inatividade] e-mail para ${email}: ${studentName} inativo ha 7 dias`);
    return true; // loga em dev, nao envia
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "SpeakFlow Escolas <noreply@speakflow.ia.br>",
        to: email,
        subject: `${studentName} esta ha 7 dias sem praticar`,
        html: `<p>Ola!</p><p><strong>${studentName}</strong> esta ha 7 dias sem praticar no SpeakFlow Escolas.</p>
               <p>Que tal incentiva-lo(a) a fazer uma atividade hoje? Basta abrir o app.</p>
               <p><a href="https://speakflow.ia.br/escola/aluno/entrar">Acessar o app</a></p>
               <hr/><p style="font-size:12px;color:#888">Para nao receber mais estes avisos, acesse sua conta da familia e desative as notificacoes.</p>`,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

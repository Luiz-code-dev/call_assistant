/**
 * Avisos do reforço para o responsável: no celular (web push) e por e-mail.
 *
 * - SEM_ESTUDO: mais de 24 horas sem estudar (verificado a cada 10 minutos, das 9h às 20h)
 * - ATENCAO: travou em um assunto (esgotou as tentativas e ganhou a trilha da base,
 *   ou errou 2 vezes na mesma matéria no dia)
 * - CONQUISTA: terminou uma trilha
 *
 * No máximo um aviso de cada tipo por filho e por dia (EduGuardianAlert). Nada passa
 * pela IA e nenhuma nota aparece. WhatsApp: o número e a autorização já são guardados;
 * o envio entra quando a conta oficial da Meta estiver aprovada.
 */
import webpush from "web-push";
import { urlDoSite } from "@/lib/escola/public-url";
import { Resend } from "resend";
import { catalogDb } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { subjectInfo } from "@/lib/escola/subjects";
import { diaSaoPaulo } from "@/lib/escola/semana-filho";
import type { Aviso } from "@/lib/escola/avisos";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */

export type TipoAvisoFamilia = "SEM_ESTUDO" | "ATENCAO" | "CONQUISTA" | `NOVO_RESPONSAVEL:${string}` | `INDICACAO:${string}`;

const BADGE = "/escola-icons/aviso-badge.png";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@speakf.com.br";
let vapidPronto = false;

function pushConfigurado(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function primeiroNome(nome: string): string {
  return (nome ?? "").trim().split(/\s+/)[0] || "Seu filho";
}

export function avisoSemEstudo(nome: string, dias: number, studentId: string): Aviso {
  const n = primeiroNome(nome);
  return {
    tipo: "familia-sem-estudo",
    title: dias >= 2 ? `${n} está há ${dias} dias sem estudar` : `${n} não estuda desde ontem`,
    body: "O reforço rende mais um pouquinho todo dia. Que tal mandar um recado para lembrar?",
    url: `/escola/familia/${studentId}#recado`,
    icon: "/escola-icons/aviso-lembrete.png", badge: BADGE, tag: `familia-sem-estudo-${studentId}`, vibrate: [300, 150, 300],
  };
}

export function avisoAtencao(nome: string, materia: string | null, assunto: string | null, studentId: string, base: boolean): Aviso {
  const n = primeiroNome(nome);
  const m = materia ? subjectInfo(materia).name : "";
  const sobre = assunto ? ` em ${assunto}` : "";
  return {
    tipo: "familia-atencao",
    title: m ? `${n} precisa de ajuda em ${m}` : `${n} precisa de ajuda`,
    body: base
      ? `Teve dificuldade${sobre}. Já preparamos uma trilha para reforçar a base. Sentar junto hoje faz diferença.`
      : `Errou algumas atividades${sobre} hoje. Uma ajuda sua agora faz diferença.`,
    url: `/escola/familia/${studentId}`,
    icon: "/escola-icons/aviso-sugestao.png", badge: BADGE, tag: `familia-atencao-${studentId}`, vibrate: [150, 100, 150],
  };
}

/** O próprio aluno pediu, pelo Flow, para avisar a família que travou num assunto */
export function avisoPedidoDeAjuda(nome: string, materia: string | null, assunto: string | null, studentId: string): Aviso {
  const n = primeiroNome(nome);
  const m = materia ? subjectInfo(materia).name : "";
  return {
    tipo: "familia-atencao",
    title: m ? `${n} pediu ajuda em ${m}` : `${n} pediu ajuda`,
    body: `Está com dificuldade${assunto ? ` em "${assunto}"` : ""} e pediu para avisar você. Sentar junto alguns minutos hoje faz diferença.`,
    url: `/escola/familia/${studentId}`,
    icon: "/escola-icons/aviso-sugestao.png", badge: BADGE, tag: `familia-atencao-${studentId}`, vibrate: [150, 100, 150],
  };
}

export function avisoConquista(nome: string, materia: string | null, trilha: string | null, studentId: string): Aviso {
  const n = primeiroNome(nome);
  const m = materia ? subjectInfo(materia).name : "";
  return {
    tipo: "familia-conquista",
    title: `${n} terminou uma trilha!`,
    body: trilha ? `Concluiu "${trilha}"${m ? ` em ${m}` : ""}. Mande um elogio!` : "Mande um elogio pelo esforço!",
    url: `/escola/familia/${studentId}#recado`,
    icon: "/escola-icons/aviso-elogio.png", badge: BADGE, tag: `familia-conquista-${studentId}`, vibrate: [100, 50, 100, 50, 300],
  };
}

export function avisoNovoResponsavel(nomeAluno: string, nomeNovo: string, parentesco: string, studentId: string): Aviso {
  const n = primeiroNome(nomeAluno);
  return {
    tipo: "familia-novo-responsavel",
    title: `Um novo responsável foi ligado a ${n}`,
    body: `${primeiroNome(nomeNovo)} (${parentesco}) agora acompanha o reforço de ${n}. Se você não conhece essa pessoa, fale com a escola.`,
    url: `/escola/familia/${studentId}`,
    icon: "/escola-icons/aviso-lembrete.png", badge: BADGE, tag: `familia-novo-responsavel-${studentId}`, vibrate: [200, 100, 200],
  };
}

async function pushParaResponsavel(db: any, networkId: string, guardianId: string, aviso: Aviso): Promise<number> {
  if (!pushConfigurado()) return 0;
  if (!vapidPronto) { webpush.setVapidDetails(VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!); vapidPronto = true; }
  const subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> =
    await db.eduGuardianPushSubscription.findMany({ where: { networkId, guardianId } });
  let ok = 0;
  await Promise.allSettled(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 60 * 60 * 12 });
      ok++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.eduGuardianPushSubscription.deleteMany({ where: { id: s.id } }).catch(() => null);
    }
  }));
  return ok;
}

function escaparHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function emailDoAviso(nomeResponsavel: string, aviso: Aviso, base: string): { subject: string; html: string; text: string } {
  const link = `${base}${aviso.url}`;
  const ola = primeiroNome(nomeResponsavel);
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:28px 22px;background:#F6F4FE;color:#1F1A2E">
  <div style="background:#ffffff;border-radius:20px;padding:24px">
    <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#6D28D9;text-transform:uppercase;letter-spacing:.04em">SpeakFlow Escolas · Reforço</p>
    <p style="margin:0 0 16px;font-size:14px;color:#5B5470">Olá, ${escaparHtml(ola)}!</p>
    <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3">${escaparHtml(aviso.title)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3B3550">${escaparHtml(aviso.body)}</p>
    <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6D28D9;color:#ffffff;border-radius:14px;text-decoration:none;font-weight:bold;font-size:15px">Abrir o painel da família</a>
  </div>
  <p style="margin:16px 4px 0;font-size:12px;color:#8B84A0;line-height:1.4">Você recebe este e-mail porque acompanha o reforço escolar do seu filho. Para não receber mais, abra Configurações no painel da família e desligue os avisos por e-mail.</p>
</div>`;
  return { subject: aviso.title, html, text: `${aviso.title}\n\n${aviso.body}\n\nAbrir o painel da família: ${link}` };
}

async function emailParaResponsavel(guardian: { name: string; email: string | null; emailAlertsOff: boolean }, aviso: Aviso): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !guardian.email || guardian.emailAlertsOff) return false;
  const base = urlDoSite(process.env.NEXT_PUBLIC_APP_URL);
  const msg = emailDoAviso(guardian.name, aviso, base);
  try {
    await new Resend(key).emails.send({
      from: process.env.EMAIL_FROM || "SpeakFlow <onboarding@resend.dev>",
      to: guardian.email, subject: msg.subject, html: msg.html, text: msg.text,
    });
    return true;
  } catch (err) {
    console.error("[escolas/avisos-familia] e-mail:", (err as Error).message);
    return false;
  }
}

/**
 * Avisa todos os responsáveis ativos do aluno. Cada responsável recebe no máximo um
 * aviso de cada tipo por dia. Devolve quantos responsáveis foram avisados.
 */
export async function avisarFamilia(db: any, networkId: string, studentId: string, tipo: TipoAvisoFamilia, aviso: Aviso, now = new Date(), exceto?: string): Promise<number> {
  const dia = diaSaoPaulo(now);
  const links: Array<{ guardianId: string }> = await db.eduGuardianLink.findMany({
    where: { networkId, studentId, isActive: true, ...(exceto ? { guardianId: { not: exceto } } : {}) }, select: { guardianId: true },
  });
  let avisados = 0;
  for (const { guardianId } of links) {
    // Marca antes de enviar: o índice único impede o mesmo aviso duas vezes no dia
    const marcado = await db.eduGuardianAlert.create({
      data: { networkId, guardianId, studentId, kind: tipo, day: dia, title: aviso.title, body: aviso.body },
    }).then(() => true).catch(() => false);
    if (!marcado) continue;
    const g = await db.eduGuardian.findUnique({ where: { id: guardianId }, select: { name: true, email: true, emailAlertsOff: true } });
    if (!g) continue;
    await pushParaResponsavel(db, networkId, guardianId, aviso).catch(() => 0);
    await emailParaResponsavel(g, aviso).catch(() => false);
    avisados++;
  }
  return avisados;
}

/** Último momento em que o aluno estudou (entrega ou diagnóstico), ou null */
export async function ultimoEstudo(db: any, studentId: string): Promise<Date | null> {
  const [sub, sess] = await Promise.all([
    db.eduSubmission.findFirst({ where: { studentId, submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, select: { submittedAt: true } }),
    db.eduAttemptSession.findFirst({ where: { studentId }, orderBy: { lastActivityAt: "desc" }, select: { lastActivityAt: true } }),
  ]);
  const ts = [sub?.submittedAt, sess?.lastActivityAt].filter((d): d is Date => !!d).map((d) => new Date(d).getTime());
  return ts.length ? new Date(Math.max(...ts)) : null;
}

/** Horário em que avisos de "sem estudar" podem sair (9h às 20h de São Paulo) */
export function horarioDeAvisar(now = new Date()): boolean {
  const h = new Date(now.getTime() - 3 * 60 * 60 * 1000).getUTCHours();
  return h >= 9 && h < 20;
}

/** Percorre as redes e avisa os responsáveis de quem passou de 24 horas sem estudar */
export async function verificarSemEstudo(now = new Date()): Promise<number> {
  if (!horarioDeAvisar(now)) return 0;
  const limite = now.getTime() - 24 * 60 * 60 * 1000;
  const redes: Array<{ id: string }> = await catalogDb.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  let total = 0;
  for (const rede of redes) {
    let db: any;
    try { db = await getTenantDb(rede.id); } catch { continue; }
    const links: Array<{ studentId: string; createdAt: Date }> = await db.eduGuardianLink.findMany({
      where: { networkId: rede.id, isActive: true }, select: { studentId: true, createdAt: true },
    }).catch(() => []);
    const vistos = new Set<string>();
    for (const l of links) {
      if (vistos.has(l.studentId)) continue;
      vistos.add(l.studentId);
      const ja = await db.eduGuardianAlert.findFirst({ where: { networkId: rede.id, studentId: l.studentId, kind: "SEM_ESTUDO", day: diaSaoPaulo(now) }, select: { id: true } }).catch(() => null);
      if (ja) continue;
      const ultimo = await ultimoEstudo(db, l.studentId).catch(() => null);
      const desde = ultimo?.getTime() ?? new Date(l.createdAt).getTime();
      if (desde > limite) continue;
      const aluno = await db.eduStudent.findUnique({ where: { id: l.studentId }, select: { fullName: true, isActive: true } });
      if (!aluno?.isActive) continue;
      const dias = Math.max(1, Math.floor((now.getTime() - desde) / 86_400_000));
      total += await avisarFamilia(db, rede.id, l.studentId, "SEM_ESTUDO", avisoSemEstudo(aluno.fullName, dias, l.studentId), now).catch(() => 0);
    }
  }
  return total;
}

/**
 * Depois de uma entrega: conquista (trilha concluída) e atenção (base atribuída, ou
 * 2 "Praticando" na mesma matéria no dia). Não deixa a entrega falhar.
 */
export async function avisosDaEntrega(
  db: any,
  ctx: { networkId: string; studentId: string },
  activity: { id: string; subjectCode?: string | null; title?: string | null },
  nivel: "MASTERED" | "ALMOST" | "NOT_YET" | null,
  trilha: { trilhaConcluida: boolean; base: { titulo: string } | null } | null,
): Promise<void> {
  try {
    const aluno = await db.eduStudent.findUnique({ where: { id: ctx.studentId }, select: { fullName: true } });
    if (!aluno) return;
    const materia = activity.subjectCode ?? null;
    if (trilha?.trilhaConcluida) {
      const t = await db.eduTrackAssignment.findFirst({
        where: { networkId: ctx.networkId, studentId: ctx.studentId, track: { items: { some: { activityId: activity.id } } } },
        orderBy: { startsAt: "desc" }, include: { track: { select: { title: true, subjectCode: true } } },
      }).catch(() => null);
      const { tituloParaAluno } = await import("@/lib/escola/texto-aluno");
      await avisarFamilia(db, ctx.networkId, ctx.studentId, "CONQUISTA",
        avisoConquista(aluno.fullName, t?.track?.subjectCode ?? materia, t?.track?.title ? tituloParaAluno(t.track.title) : null, ctx.studentId));
    }
    if (trilha?.base) {
      await avisarFamilia(db, ctx.networkId, ctx.studentId, "ATENCAO",
        avisoAtencao(aluno.fullName, materia, trilha.base.titulo, ctx.studentId, true));
      return;
    }
    if (nivel === "NOT_YET" && materia) {
      const inicioDoDia = new Date(`${diaSaoPaulo(new Date())}T03:00:00Z`);
      const erros = await db.eduSubmission.count({
        where: { studentId: ctx.studentId, masteryLevel: "NOT_YET", submittedAt: { gte: inicioDoDia }, activity: { subjectCode: materia } },
      }).catch(() => 0);
      if (erros >= 2) {
        await avisarFamilia(db, ctx.networkId, ctx.studentId, "ATENCAO",
          avisoAtencao(aluno.fullName, materia, null, ctx.studentId, false));
      }
    }
  } catch (err) {
    console.error("[escolas/avisos-familia] entrega:", (err as Error).message);
  }
}

let iniciado = false;
let rodando = false;
export function iniciarAvisosDaFamilia() {
  if (iniciado || !isEscolasEnabled()) return;
  iniciado = true;
  setInterval(async () => {
    if (rodando) return;
    rodando = true;
    try { await verificarSemEstudo(); } catch (err) { console.error("[escolas/avisos-familia]", (err as Error).message); }
    finally { rodando = false; }
  }, 10 * 60_000);
  console.log("[escolas/avisos-familia] avisos para a família ativos (a cada 10 minutos)");
}

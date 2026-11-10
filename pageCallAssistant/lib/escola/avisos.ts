/**
 * Avisos (web push) para o aluno: recado da família e horário da agenda.
 * Cada tipo tem título, ícone, vibração e grupo (tag) próprios.
 * O texto do recado é o que a família escreveu; nada passa pela IA.
 */
import webpush from "web-push";
import { subjectInfo } from "@/lib/escola/subjects";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@speakf.com.br";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
let configurado = false;

export function avisosConfigurados(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export interface Aviso { title: string; body: string; url: string; icon: string; badge: string; tag: string; vibrate: number[]; tipo: string }

const BADGE = "/escola-icons/aviso-badge.png";

export function avisoDeRecado(kind: string, texto: string, de: string): Aviso {
  const quem = de ? ` de ${de}` : " da sua família";
  const corpo = texto.length > 140 ? texto.slice(0, 137) + "..." : texto;
  switch (kind) {
    case "ELOGIO":
      return { tipo: "elogio", title: `Um elogio${quem}`, body: corpo, url: "/escola/aluno", icon: "/escola-icons/aviso-elogio.png", badge: BADGE, tag: "recado-elogio", vibrate: [100, 50, 100, 50, 300] };
    case "SUGESTAO":
      return { tipo: "sugestao", title: `Uma sugestão${quem}`, body: corpo, url: "/escola/aluno", icon: "/escola-icons/aviso-sugestao.png", badge: BADGE, tag: "recado-sugestao", vibrate: [150, 100, 150] };
    default:
      return { tipo: "lembrete", title: `Um lembrete${quem}`, body: corpo, url: "/escola/aluno", icon: "/escola-icons/aviso-lembrete.png", badge: BADGE, tag: "recado-lembrete", vibrate: [300, 150, 300] };
  }
}

export function avisoDeAgenda(
  item: { time: string; subjectCode: string | null; minutes: number },
  destino?: { titulo: string; materia: string | null; href: string } | null,
): Aviso {
  const materia = destino?.materia ?? (item.subjectCode ? subjectInfo(item.subjectCode).name : "");
  const oque = destino?.titulo && destino.titulo !== materia ? destino.titulo : "";
  return {
    tipo: "agenda",
    title: materia ? `Hora de estudar ${materia}` : "Hora de praticar",
    body: oque
      ? `Combinado para as ${item.time}: ${item.minutes} minutos de ${oque}. Bora começar?`
      : materia
        ? `Combinado para as ${item.time}: ${item.minutes} minutos de ${materia}. Bora começar?`
        : `Combinado para as ${item.time}: ${item.minutes} minutos na sua trilha. Bora começar?`,
    url: destino?.href ?? (item.subjectCode ? "/escola/aluno" : "/escola/aluno/trilha"),
    icon: "/escola-icons/aviso-agenda.png", badge: BADGE, tag: `agenda-${item.time}`, vibrate: [200, 100, 200, 100, 200],
  };
}

/** Envia para todos os aparelhos do aluno; remove inscrições vencidas. Devolve quantos receberam. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function enviarAviso(db: any, networkId: string, studentId: string, aviso: Aviso): Promise<number> {
  if (!avisosConfigurados()) return 0;
  if (!configurado) { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY); configurado = true; }
  const subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> =
    await db.eduPushSubscription.findMany({ where: { networkId, studentId } });
  let ok = 0;
  await Promise.allSettled(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 60 * 60 * 6 });
      ok++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.eduPushSubscription.deleteMany({ where: { id: s.id } }).catch(() => null);
    }
  }));
  return ok;
}

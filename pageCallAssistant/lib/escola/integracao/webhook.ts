/**
 * lib/escola/integracao/webhook.ts
 *
 * Avisos a sistemas externos (webhooks). Quando algo acontece (por exemplo, o aluno muda
 * de degrau), o SpeakFlow chama o endereço cadastrado pela rede.
 *
 * Segurança:
 *   - destino validado no cadastro e de novo a cada envio (só https público; ver destino.ts);
 *   - cada aviso vai assinado (HMAC-SHA256) com o segredo daquele endereço;
 *   - não seguimos redirecionamento, o tempo de espera é curto e a resposta é descartada;
 *   - o aviso leva a matrícula e o código da habilidade: nunca nome, data de nascimento ou PIN;
 *   - endereço que falha muitas vezes seguidas é desligado sozinho.
 */
import { randomUUID } from "node:crypto";
import { assinar, decifrar } from "./cripto";
import { validarDestino } from "./destino";

export const EVENTOS = {
  "aluno.nivel_alterado": "O aluno mudou de degrau em um conteúdo",
  "integracao.teste": "Aviso de teste, enviado pela tela de integrações",
} as const;
export type Evento = keyof typeof EVENTOS;
export function ehEvento(v: unknown): v is Evento { return typeof v === "string" && v in EVENTOS; }

const TEMPO_LIMITE_MS = 5000;
const TENTATIVAS = 3;
const ESPERAS_MS = [1000, 4000];
const FALHAS_PARA_DESLIGAR = 20;

/** Redes sem endereço cadastrado não pagam consulta a cada evento: guarda a resposta por 1 minuto. */
const temEndereco = new Map<string, { ate: number; tem: boolean }>();
export function esquecerCacheDeEnderecos(networkId: string): void { temEndereco.delete(networkId); }

export interface CorpoDoAviso {
  id: string;
  evento: Evento;
  criadoEm: string;
  rede: string;
  dados: Record<string, unknown>;
}

export function montarAviso(networkId: string, evento: Evento, dados: Record<string, unknown>): CorpoDoAviso {
  return { id: randomUUID(), evento, criadoEm: new Date().toISOString(), rede: networkId, dados };
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envia um aviso a um endereço, com novas tentativas. Devolve o resultado final. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function entregar(db: any, endpoint: { id: string; networkId: string; url: string; secretEnc: string; failCount: number }, aviso: CorpoDoAviso): Promise<{ ok: boolean; codigo: number | null; motivo?: string }> {
  const corpo = JSON.stringify(aviso);
  const registro = await db.eduWebhookDelivery.create({
    data: { networkId: endpoint.networkId, endpointId: endpoint.id, event: aviso.evento, payload: aviso, status: "PENDING", attempts: 0 },
  }).catch(() => null);

  let codigo: number | null = null;
  let motivo: string | undefined;
  let ok = false;
  let tentativas = 0;

  for (let t = 0; t < TENTATIVAS && !ok; t++) {
    tentativas = t + 1;
    if (t > 0) await dormir(ESPERAS_MS[t - 1] ?? 4000);
    const destino = await validarDestino(endpoint.url);
    if (!destino.ok) { motivo = destino.motivo; break; }
    const instante = Math.floor(Date.now() / 1000);
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    try {
      const r = await fetch(destino.url, {
        method: "POST",
        redirect: "manual",
        signal: controle.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SpeakFlow-Escolas-Integracao/1",
          "X-SpeakFlow-Evento": aviso.evento,
          "X-SpeakFlow-Entrega": aviso.id,
          "X-SpeakFlow-Assinatura": assinar(decifrar(endpoint.secretEnc), instante, corpo),
        },
        body: corpo,
      });
      codigo = r.status;
      ok = r.status >= 200 && r.status < 300;
      if (!ok) motivo = `O servidor respondeu ${r.status}.`;
      // 4xx (exceto 408 e 429) não melhora tentando de novo
      if (!ok && r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) break;
    } catch {
      motivo = "Sem resposta do servidor no tempo limite.";
    } finally {
      clearTimeout(relogio);
    }
  }

  const agora = new Date();
  if (registro) {
    await db.eduWebhookDelivery.update({
      where: { id: registro.id },
      data: { status: ok ? "DELIVERED" : "FAILED", attempts: tentativas, responseCode: codigo, deliveredAt: ok ? agora : null },
    }).catch(() => null);
  }
  const falhas = ok ? 0 : endpoint.failCount + 1;
  await db.eduWebhookEndpoint.update({
    where: { id: endpoint.id },
    data: {
      failCount: falhas, lastDeliveryAt: agora, lastStatus: ok ? "OK" : (motivo ?? "Falhou").slice(0, 200),
      ...(falhas >= FALHAS_PARA_DESLIGAR ? { isActive: false } : {}),
    },
  }).catch(() => null);
  if (falhas >= FALHAS_PARA_DESLIGAR) esquecerCacheDeEnderecos(endpoint.networkId);

  return { ok, codigo, motivo };
}

/**
 * Dispara um evento para todos os endereços ativos da rede que o assinam.
 * Nunca lança erro: aviso externo não pode atrapalhar o uso do sistema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function dispararEvento(db: any, networkId: string, evento: Evento, dados: Record<string, unknown>): Promise<void> {
  try {
    const cache = temEndereco.get(networkId);
    if (cache && cache.ate > Date.now() && !cache.tem) return;
    const enderecos: Array<{ id: string; networkId: string; url: string; secretEnc: string; failCount: number; events: string[] }> =
      await db.eduWebhookEndpoint.findMany({ where: { networkId, isActive: true } });
    temEndereco.set(networkId, { ate: Date.now() + 60_000, tem: enderecos.length > 0 });
    const destinos = enderecos.filter((e) => (e.events ?? []).includes(evento));
    if (!destinos.length) return;
    const aviso = montarAviso(networkId, evento, dados);
    await Promise.all(destinos.map((e) => entregar(db, e, aviso).catch(() => null)));
  } catch {
    // silencioso de propósito
  }
}

const NOME_DO_NIVEL: Record<string, string> = { NOT_YET: "PRATICANDO", ALMOST: "QUASE_LA", MASTERED: "DOMINA" };

/** Aviso "aluno.nivel_alterado". Busca a matrícula e o código da habilidade (sem nome do aluno). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function avisarMudancaDeNivel(db: any, o: { networkId: string; studentId: string; skillId: string; de: string | null; para: string; origem: string }): Promise<void> {
  try {
    const cache = temEndereco.get(o.networkId);
    if (cache && cache.ate > Date.now() && !cache.tem) return;
    const [aluno, habilidade] = await Promise.all([
      db.eduStudent.findUnique({ where: { id: o.studentId }, select: { enrollmentCode: true } }),
      db.eduSkill.findUnique({ where: { id: o.skillId }, select: { code: true } }),
    ]);
    if (!aluno || !habilidade) return;
    await dispararEvento(db, o.networkId, "aluno.nivel_alterado", {
      matricula: aluno.enrollmentCode,
      habilidade: habilidade.code,
      nivelAnterior: o.de ? NOME_DO_NIVEL[o.de] ?? o.de : null,
      nivelAtual: NOME_DO_NIVEL[o.para] ?? o.para,
      origem: o.origem,
    });
  } catch {
    // silencioso de propósito
  }
}

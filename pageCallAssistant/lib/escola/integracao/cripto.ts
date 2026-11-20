/**
 * lib/escola/integracao/cripto.ts
 *
 * Cifra o segredo dos avisos (webhooks) antes de gravar. Diferente da chave de acesso,
 * o segredo precisa ser lido de volta para assinar cada aviso, então não pode ser hash.
 *
 * AES-256-GCM. A chave de cifra sai de ESCOLAS_INTEGRATION_SECRET (ou, na falta dela,
 * de EDU_JWT_SECRET) e nunca vai para o banco.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

function chaveDeCifra(): Buffer {
  const base = process.env.ESCOLAS_INTEGRATION_SECRET || process.env.EDU_JWT_SECRET;
  if (!base) {
    if (process.env.NODE_ENV === "production") throw new Error("[escolas] ESCOLAS_INTEGRATION_SECRET ou EDU_JWT_SECRET não configurada.");
    return createHash("sha256").update("integracao-dev-secret-change-me").digest();
  }
  return createHash("sha256").update(`integracao:v1:${base}`).digest();
}

/** Devolve "v1.<iv>.<tag>.<dados>" em base64url. */
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chaveDeCifra(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), dados.toString("base64url")].join(".");
}

export function decifrar(cifrado: string): string {
  const [versao, iv, tag, dados] = cifrado.split(".");
  if (versao !== "v1" || !iv || !tag || !dados) throw new Error("Segredo cifrado em formato desconhecido.");
  const d = createDecipheriv("aes-256-gcm", chaveDeCifra(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(dados, "base64url")), d.final()]).toString("utf8");
}

/** Segredo novo de um endereço de avisos (mostrado uma vez ao gestor). */
export function gerarSegredo(): string {
  return `whsec_${randomBytes(32).toString("base64url")}`;
}

/**
 * Assinatura de um aviso: HMAC-SHA256 de "<instante>.<corpo>" com o segredo do endereço.
 * Vai no cabeçalho X-SpeakFlow-Assinatura: t=<instante>,v1=<assinatura>.
 * O instante entra na conta para o receptor recusar avisos antigos reenviados por terceiros.
 */
export function assinar(segredo: string, instante: number, corpo: string): string {
  const v1 = createHmac("sha256", segredo).update(`${instante}.${corpo}`, "utf8").digest("hex");
  return `t=${instante},v1=${v1}`;
}

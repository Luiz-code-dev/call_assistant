/**
 * lib/escola/integracao/destino.ts
 *
 * Valida o endereço para onde mandamos avisos. O gestor digita uma URL e o nosso
 * servidor faz a chamada: sem esta checagem, daria para apontar o servidor para dentro
 * da nossa própria rede (SSRF). Regras:
 *   - só https, sem usuário/senha na URL, porta padrão ou 443/8443;
 *   - o nome não pode ser IP escrito à mão nem nome interno;
 *   - todos os IPs para os quais o nome resolve precisam ser públicos.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** IP reservado, privado, de loopback, link-local ou de metadados de nuvem. Função pura. */
export function ipReservado(ip: string): boolean {
  const limpo = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const mapeado = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(limpo);
  const v4 = mapeado ? mapeado[1] : limpo;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (isIP(limpo) === 6) {
    return (
      limpo === "::" || limpo === "::1" ||
      limpo.startsWith("fc") || limpo.startsWith("fd") ||
      limpo.startsWith("fe8") || limpo.startsWith("fe9") || limpo.startsWith("fea") || limpo.startsWith("feb") ||
      limpo.startsWith("ff") || limpo.startsWith("64:ff9b:") || limpo.startsWith("2001:db8:")
    );
  }
  return true; // não é IP reconhecível: trate como não confiável
}

/** Checagens que não dependem de rede. Devolve o motivo da recusa, ou null se passou. Função pura. */
export function motivoUrlInvalida(bruta: string): string | null {
  let u: URL;
  try { u = new URL(bruta); } catch { return "O endereço não é uma URL válida."; }
  if (u.protocol !== "https:") return "O endereço precisa começar com https://.";
  if (u.username || u.password) return "O endereço não pode trazer usuário e senha.";
  if (u.port && !["443", "8443"].includes(u.port)) return "Use a porta padrão (443) ou 8443.";
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(host)) return "Use o nome do servidor, não o número IP.";
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost") || host === "localhost") {
    return "O endereço precisa ser um servidor público na internet.";
  }
  if (bruta.length > 500) return "O endereço é longo demais.";
  return null;
}

/** Validação completa, com consulta de DNS. Chamada ao cadastrar e a cada envio. */
export async function validarDestino(bruta: string): Promise<{ ok: true; url: URL } | { ok: false; motivo: string }> {
  const motivo = motivoUrlInvalida(bruta);
  if (motivo) return { ok: false, motivo };
  const url = new URL(bruta);
  try {
    const enderecos = await lookup(url.hostname, { all: true });
    if (!enderecos.length) return { ok: false, motivo: "O servidor não foi encontrado." };
    if (enderecos.some((e) => ipReservado(e.address))) return { ok: false, motivo: "O endereço aponta para uma rede interna e não pode ser usado." };
  } catch {
    return { ok: false, motivo: "O servidor não foi encontrado." };
  }
  return { ok: true, url };
}

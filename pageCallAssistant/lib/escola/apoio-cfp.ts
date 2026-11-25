/**
 * Consulta do registro de psicólogo no cadastro do Conselho Federal de Psicologia, pela Infosimples.
 * Só roda com INFOSIMPLES_TOKEN configurado. Sem token, com erro de rede ou com resposta inesperada
 * o resultado é FALHA, e o cadastro segue como "declarado pelo gestor".
 * O token nunca vai para o registro de erros.
 */
import { interpretarConsulta, type ResultadoDaConsulta } from "@/lib/escola/apoio-profissional";

const ENDERECO_PADRAO = "https://api.infosimples.com/api/v2/consultas/cfp/cadastro";

export function consultaDoCfpConfigurada(): boolean {
  return !!process.env.INFOSIMPLES_TOKEN;
}

export async function consultarCfp(registro: string, uf: string, nome: string): Promise<{ resultado: ResultadoDaConsulta; situacao: string | null }> {
  const token = process.env.INFOSIMPLES_TOKEN;
  if (!token) return { resultado: "FALHA", situacao: null };
  const corpo = new URLSearchParams({ token, registro, uf, timeout: "300" });
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 25_000);
  try {
    const r = await fetch(process.env.INFOSIMPLES_CFP_URL || ENDERECO_PADRAO, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: corpo, signal: controle.signal,
    });
    const json = await r.json().catch(() => null);
    const lido = interpretarConsulta(json, nome);
    if (lido.resultado === "FALHA") console.error("[apoio/cfp] consulta sem resultado utilizável; http", r.status, "code", (json as { code?: unknown } | null)?.code ?? "-");
    return lido;
  } catch (err) {
    console.error("[apoio/cfp] falha na consulta:", (err as Error).name);
    return { resultado: "FALHA", situacao: null };
  } finally {
    clearTimeout(limite);
  }
}

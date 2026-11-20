/**
 * lib/escola/escopo.ts
 *
 * Permite subir o SpeakFlow Escolas sozinho (sem o SpeakFlow IA) a partir da mesma imagem.
 * Tudo aqui é opcional: sem as variáveis abaixo, o comportamento é exatamente o de hoje.
 *
 *   APP_SCOPE=escolas            → esta instância serve só o Escolas
 *   ESCOLAS_AGENDADORES=externo  → os lembretes não rodam dentro do servidor; um agendador
 *                                  de fora chama /api/escola/cron/agenda e /cron/avisos-familia
 *
 * Funções puras e sem módulos do Node: este arquivo é usado pelo middleware (edge).
 */

function limpo(v: string | undefined | null): string {
  return (v ?? "").trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase();
}

/** Esta instância serve apenas o SpeakFlow Escolas? */
export function apenasEscolas(valor: string | undefined = process.env.APP_SCOPE): boolean {
  return limpo(valor) === "escolas";
}

/** Os lembretes (agenda e avisos à família) rodam dentro do servidor? Padrão: sim. */
export function agendadoresInternos(valor: string | undefined = process.env.ESCOLAS_AGENDADORES): boolean {
  return limpo(valor) !== "externo";
}

export type DecisaoDeEscopo =
  | { tipo: "seguir" }          // segue para as regras normais do middleware
  | { tipo: "liberar" }         // arquivo público: responde direto
  | { tipo: "redirecionar"; destino: string };

/** O caminho é do Escolas (páginas, verificação de documento)? */
export function caminhoDoEscolas(pathname: string): boolean {
  return pathname === "/escola" || pathname.startsWith("/escola/") || pathname.startsWith("/escola-")
    || pathname === "/verificar" || pathname.startsWith("/verificar/");
}

/** Arquivo público (tem extensão) ou pasta .well-known: ícones, manifesto, service worker. */
export function arquivoPublico(pathname: string): boolean {
  if (pathname.startsWith("/.well-known/")) return true;
  const ultimo = pathname.split("/").pop() ?? "";
  return /\.[a-z0-9]{2,5}$/i.test(ultimo);
}

/**
 * Regras do middleware quando a instância serve só o Escolas.
 *   - nunca manda para o domínio do SpeakFlow IA;
 *   - chamada sem https (atrás do balanceador) volta para https no MESMO endereço;
 *   - páginas que não são do Escolas levam para a entrada do Escolas.
 * `url` é a URL completa da chamada; `host` e `proto` vêm dos cabeçalhos do balanceador.
 */
export function decidirEscopoEscolas(o: { url: string; host: string; proto: string }): DecisaoDeEscopo {
  const u = new URL(o.url);
  const host = o.host || u.host;
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (!local && o.proto === "http") {
    return { tipo: "redirecionar", destino: `https://${host}${u.pathname}${u.search}` };
  }
  if (caminhoDoEscolas(u.pathname)) return { tipo: "seguir" };
  if (arquivoPublico(u.pathname)) return { tipo: "liberar" };
  return { tipo: "redirecionar", destino: `${local ? u.protocol : "https:"}//${host}/escola/inicio` };
}

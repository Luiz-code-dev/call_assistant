/**
 * lib/escola/integracao/entrada.ts
 *
 * Recebe um lote de cadastros de um sistema externo e grava pelo MESMO caminho da
 * importação por planilha (validadores + processador). Assim a regra é uma só, o lote
 * aparece no histórico de importações da rede e reenviar o mesmo lote não duplica nada
 * (escola pelo INEP, aluno pela matrícula, servidor pelo e-mail).
 */
import { prismaEdu } from "@/lib/escola/db";
import { parseCsvString } from "@/lib/escola/import/parser";
import { processImportBatch } from "@/lib/escola/import/processor";
import { validateAssignmentRow, validateSchoolRow, validateStaffRow, validateStudentRow } from "@/lib/escola/import/validators";
import { paraLinha, type Linha, type TipoCadastro } from "./mapa";
import { registrarIntegracao, type IntegracaoCtx } from "./auth";

export const MAX_ITENS = 500;
export const MAX_CSV_BYTES = 2 * 1024 * 1024;

export interface ErroDeItem { item: number; campo: string; mensagem: string }
export interface ResultadoLote {
  recebidos: number; criados: number; atualizados: number; recusados: number;
  erros: ErroDeItem[]; loteId: string | null;
}

const VALIDADOR = {
  SCHOOLS: validateSchoolRow, STAFF: validateStaffRow, STUDENTS: validateStudentRow, ASSIGNMENTS: validateAssignmentRow,
} as const;

/** Lê o corpo da chamada: JSON ({ itens: [...] } ou lista direta) ou CSV (text/csv). */
export async function lerItens(req: Request): Promise<{ itens: unknown[]; origem: "json" | "csv" } | { erro: string; status: number }> {
  const tipo = (req.headers.get("content-type") ?? "").toLowerCase();
  if (tipo.includes("text/csv")) {
    const texto = await req.text();
    if (Buffer.byteLength(texto, "utf8") > MAX_CSV_BYTES) return { erro: "Arquivo maior que 2 MB. Divida em partes.", status: 413 };
    const lido = parseCsvString(texto);
    if (lido.rows.length > MAX_ITENS) return { erro: `No máximo ${MAX_ITENS} linhas por chamada. Divida em partes.`, status: 413 };
    return { itens: lido.rows, origem: "csv" };
  }
  let corpo: unknown;
  try { corpo = await req.json(); } catch { return { erro: "Corpo inválido: envie JSON ou CSV (Content-Type: text/csv).", status: 400 }; }
  const itens = Array.isArray(corpo) ? corpo : (corpo as { itens?: unknown; items?: unknown })?.itens ?? (corpo as { items?: unknown })?.items;
  if (!Array.isArray(itens)) return { erro: 'Envie { "itens": [ ... ] }.', status: 400 };
  if (itens.length > MAX_ITENS) return { erro: `No máximo ${MAX_ITENS} itens por chamada. Divida em partes.`, status: 413 };
  return { itens, origem: "json" };
}

/** Valida, grava e registra um lote. O contexto do banco já foi definido por autenticarIntegracao. */
export async function receberLote(ctx: IntegracaoCtx, tipo: TipoCadastro, itens: unknown[], recurso: string): Promise<ResultadoLote> {
  const erros: ErroDeItem[] = [];
  const validas: Linha[] = [];
  const posicao: number[] = []; // posição de cada linha válida no lote enviado (começa em 1)

  itens.forEach((item, i) => {
    const linha = paraLinha(tipo, item, ctx.dePara);
    // Os validadores numeram como planilha (linha 2 = primeiro registro); aqui o item começa em 1.
    const falhas = VALIDADOR[tipo](linha, i + 1);
    if (falhas.length) {
      for (const f of falhas) erros.push({ item: i + 1, campo: f.field, mensagem: f.message });
    } else {
      validas.push(linha);
      posicao.push(i + 1);
    }
  });

  let criados = 0, atualizados = 0, loteId: string | null = null;
  const recusadosNaValidacao = itens.length - validas.length;
  let recusadosNaGravacao = 0;

  if (validas.length) {
    const lote = await prismaEdu.eduImportBatch.create({
      data: {
        networkId: ctx.networkId, kind: tipo, status: "PREVIEW",
        fileName: `Integração: ${ctx.keyName}`.slice(0, 120),
        totalRows: itens.length, failed: recusadosNaValidacao,
        errors: { preview: validas },
        createdById: `integracao:${ctx.keyId}`,
      },
    });
    loteId = lote.id;
    await processImportBatch(lote.id);
    const final = await prismaEdu.eduImportBatch.findUnique({ where: { id: lote.id } });
    criados = final?.created ?? 0;
    atualizados = final?.updated ?? 0;
    recusadosNaGravacao = final?.failed ?? 0;
    const errosDoLote: Array<{ row?: number; field?: string; message?: string }> = Array.isArray(final?.errors) ? final.errors : [];
    for (const e of errosDoLote) {
      // O processador numera a partir de 2 (como planilha): linha 2 = primeira linha válida.
      const indice = typeof e.row === "number" ? e.row - 2 : -1;
      erros.push({ item: posicao[indice] ?? 0, campo: e.field ?? "", mensagem: e.message ?? "Não foi possível gravar este item." });
    }
    if (final?.status === "FAILED" && !errosDoLote.some((e) => typeof e.row === "number")) recusadosNaGravacao = validas.length;
  }

  const recusados = recusadosNaValidacao + recusadosNaGravacao;
  await registrarIntegracao(ctx, {
    direction: "IN", resource: recurso,
    status: recusados === 0 ? "OK" : recusados >= itens.length ? "ERROR" : "PARTIAL",
    received: itens.length, created: criados, updated: atualizados, failed: recusados,
    // No histórico ficam só posição, campo e motivo: nunca o conteúdo enviado.
    errors: erros.length ? erros.slice(0, 50) : undefined,
  });

  return { recebidos: itens.length, criados, atualizados, recusados, erros: erros.slice(0, 200), loteId };
}

/**
 * Chamada da IA para a redação guiada (servidor).
 * - O nome do aluno e dados pessoais são apagados antes de o texto sair do servidor.
 * - Texto passa pela moderação; se for marcado, não vai para a IA e o professor lê primeiro.
 * - Sem chave ou com falha da IA: retorno por regras, que também não entrega a correção.
 */
import { getOpenAI } from "@/lib/openai";
import { moderateText, ModerationError } from "@/lib/escola/ai-gateway";
import { apagarDadosPessoais } from "@/lib/escola/dever";
import {
  dividirParagrafos, lerRetorno, promptDaRedacao, retornoPorRegras, textoParaIA,
  type PropostaParaIA, type RetornoRedacao,
} from "@/lib/escola/redacao";

export type ResultadoDaAvaliacao =
  | { status: "DONE" | "FALLBACK"; retorno: RetornoRedacao; tokens: number; erro: string | null }
  | { status: "FLAGGED"; retorno: null; tokens: 0; erro: string };

export async function avaliarRedacao(p: PropostaParaIA, texto: string, nomeDoAluno: string): Promise<ResultadoDaAvaliacao> {
  // Mesma divisão do texto guardado: os índices dos parágrafos batem com o que o aluno vê.
  const paragrafos = dividirParagrafos(texto).map((x) => apagarDadosPessoais(x, nomeDoAluno));

  try {
    await moderateText(paragrafos.join("\n"));
  } catch (e) {
    if (e instanceof ModerationError) return { status: "FLAGGED", retorno: null, tokens: 0, erro: `moderação: ${e.categories.join(",")}` };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { status: "FALLBACK", retorno: retornoPorRegras(paragrafos, p.genero), tokens: 0, erro: "sem chave da IA" };
  }

  let ultimoErro = "";
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const r = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: promptDaRedacao(p) },
          { role: "user", content: textoParaIA(paragrafos) },
        ],
      });
      const retorno = lerRetorno(r.choices[0]?.message?.content ?? "", paragrafos);
      if (!retorno) { ultimoErro = "resposta da IA fora do formato"; continue; }
      return { status: "DONE", retorno, tokens: r.usage?.total_tokens ?? 0, erro: null };
    } catch (e) {
      ultimoErro = (e as Error).message?.slice(0, 300) ?? "falha da IA";
    }
  }
  return { status: "FALLBACK", retorno: retornoPorRegras(paragrafos, p.genero), tokens: 0, erro: ultimoErro };
}

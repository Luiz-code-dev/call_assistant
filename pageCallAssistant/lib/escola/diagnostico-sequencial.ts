/**
 * lib/escola/diagnostico-sequencial.ts
 *
 * Decide, questão a questão, se o aluno domina uma habilidade. É o teste
 * sequencial da razão de probabilidades de Wald (SPRT), o mesmo princípio
 * usado em testes adaptativos de certificação.
 *
 * Modelo (por habilidade):
 *   - quem DOMINA acerta com probabilidade 1 - DESCUIDO (0,90): erra 10% por descuido;
 *   - quem NÃO DOMINA acerta com probabilidade CHUTE (0,25): chute em 4 alternativas.
 *
 * Cada acerto soma ln(0,90 / 0,25) ≈ +1,281 à evidência; cada erro soma
 * ln(0,10 / 0,75) ≈ −2,015. Com chance inicial de 50% para cada lado, a
 * evidência é o logaritmo da razão de chances; a probabilidade de dominar é
 * 1 / (1 + e^(−evidência)).
 *
 * Decisão com 95% de confiança: evidência ≥ ln(19) ≈ 2,944 → domina;
 * evidência ≤ −ln(19) → não domina; no meio, faz mais uma questão, até
 * MAX_POR_HABILIDADE. Se ainda ficar no meio, a habilidade fica "quase lá"
 * (evidência insuficiente para afirmar qualquer um dos dois).
 *
 * Na prática: 3 acertos seguidos = domina; 2 erros seguidos = não domina;
 * respostas misturadas pedem mais questões, até 8.
 *
 * Taxas exatas desta regra (todas as sequências possíveis, ver taxasDaRegra):
 *   - quem domina: reconhecido 96,8%; dado como "não domina" 1,6%; "quase lá" 1,5%;
 *   - quem não domina (só chuta): identificado 94,5%; dado como "domina" 2,5%; "quase lá" 3,0%;
 *   - média de 3,2 a 3,7 questões por habilidade.
 *
 * Funções puras: testadas em diagnostico-sequencial.test.ts, inclusive as
 * taxas de erro exatas da regra (enumerando todas as sequências possíveis).
 */

export const CHUTE = 0.25;
export const DESCUIDO = 0.1;
export const CONFIANCA = 0.95;
export const MAX_POR_HABILIDADE = 8;

export const PESO_ACERTO = Math.log((1 - DESCUIDO) / CHUTE);
export const PESO_ERRO = Math.log(DESCUIDO / (1 - CHUTE));
export const LIMIAR = Math.log(CONFIANCA / (1 - CONFIANCA));

export type Decisao = "DOMINA" | "NAO_DOMINA" | "INDEFINIDO";
export type NivelFinal = "DOMINA" | "QUASE_LA" | "AINDA_NAO";

/** Evidência acumulada (log da razão de chances) a partir das respostas, em ordem. */
export function evidencia(respostas: boolean[]): number {
  return respostas.reduce((s, certo) => s + (certo ? PESO_ACERTO : PESO_ERRO), 0);
}

/** Probabilidade de o aluno dominar a habilidade, dado o que respondeu (chance inicial 50%). */
export function probabilidadeDeDominar(respostas: boolean[]): number {
  return 1 / (1 + Math.exp(-evidencia(respostas)));
}

/**
 * Decisão do teste sequencial. Para assim que um limite é atingido: respostas
 * depois disso não mudam a decisão (o teste não "volta atrás").
 */
export function decidir(respostas: boolean[]): Decisao {
  let s = 0;
  for (const certo of respostas.slice(0, MAX_POR_HABILIDADE)) {
    s += certo ? PESO_ACERTO : PESO_ERRO;
    if (s >= LIMIAR) return "DOMINA";
    if (s <= -LIMIAR) return "NAO_DOMINA";
  }
  return "INDEFINIDO";
}

/** Ainda cabe mais uma questão desta habilidade? */
export function precisaDeMaisQuestoes(respostas: boolean[]): boolean {
  return decidir(respostas) === "INDEFINIDO" && respostas.length < MAX_POR_HABILIDADE;
}

/** Nível que vai para o resultado e para o mapa do professor. null = nenhuma resposta. */
export function nivelFinal(respostas: boolean[]): NivelFinal | null {
  if (!respostas.length) return null;
  const d = decidir(respostas);
  if (d === "DOMINA") return "DOMINA";
  if (d === "NAO_DOMINA") return "AINDA_NAO";
  return "QUASE_LA";
}

/** Nível de domínio gravado no histórico do aluno. */
export function nivelDeDominio(n: NivelFinal): "MASTERED" | "ALMOST" | "NOT_YET" {
  return n === "DOMINA" ? "MASTERED" : n === "AINDA_NAO" ? "NOT_YET" : "ALMOST";
}

/**
 * Taxas de erro exatas da regra, enumerando todas as sequências de respostas
 * possíveis até MAX_POR_HABILIDADE. Usado nos testes e no documento da regra.
 */
export function taxasDaRegra(pAcertoDomina = 1 - DESCUIDO, pAcertoNaoDomina = CHUTE) {
  function percorre(p: number) {
    const r = { domina: 0, naoDomina: 0, indefinido: 0, mediaQuestoes: 0 };
    function passo(seq: boolean[], prob: number) {
      const d = decidir(seq);
      if (d !== "INDEFINIDO" || seq.length >= MAX_POR_HABILIDADE) {
        if (d === "DOMINA") r.domina += prob;
        else if (d === "NAO_DOMINA") r.naoDomina += prob;
        else r.indefinido += prob;
        r.mediaQuestoes += prob * seq.length;
        return;
      }
      passo([...seq, true], prob * p);
      passo([...seq, false], prob * (1 - p));
    }
    passo([], 1);
    return r;
  }
  return { quemDomina: percorre(pAcertoDomina), quemNaoDomina: percorre(pAcertoNaoDomina) };
}

/** Texto curto da pergunta, para não repetir a mesma questão na sessão. */
export function chaveDaQuestao(q: string): string {
  return q.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Escolhe a próxima questão do banco sem repetir; ordem estável por semente. */
export function escolherQuestao<T extends { question: string }>(banco: T[], usadas: Set<string>, semente: number): T | null {
  const livres = banco.filter((q) => !usadas.has(chaveDaQuestao(q.question)));
  if (!livres.length) return null;
  return livres[Math.abs(Math.floor(semente)) % livres.length];
}

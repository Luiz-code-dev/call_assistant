import { describe, expect, it } from "vitest";
import { acertosNecessarios, aprovado, corrigirAvaliacao, fraseDosSelos, progressoDoLivro, seloConquistado } from "./leitura";
import { leituraDoLivro, marcarCapitulo, registrarAvaliacao, selosDaPessoa, type LeituraDoLivro } from "./leitura-db";
import { LIVROS, avaliacaoDoLivro, capitulosDoLivro } from "./livros/indice";

const IDS = ["c1", "c2", "c3"];
const CHAVE = { networkId: "rede", userId: "u1", livroSlug: "livro" };

interface Linha extends LeituraDoLivro { networkId: string; userId: string }

/** Banco de mentira com as operações que leitura-db.ts usa */
function banco() {
  const linhas: Linha[] = [];
  const achar = (w: { userId: string; livroSlug: string }) => linhas.find((l) => l.userId === w.userId && l.livroSlug === w.livroSlug);
  return {
    linhas,
    eduFormacaoLeitura: {
      findFirst: async ({ where }: { where: { userId: string; livroSlug: string } }) => achar(where) ?? null,
      findMany: async ({ where }: { where: { userId: string } }) => linhas.filter((l) => l.userId === where.userId),
      count: async ({ where }: { where: { userId: string } }) => linhas.filter((l) => l.userId === where.userId && l.concluidoEm).length,
      upsert: async ({ where, create, update }: { where: { userId_livroSlug: { userId: string; livroSlug: string } }; create: Partial<Linha> & { networkId: string; userId: string; livroSlug: string }; update: Partial<Linha> }) => {
        const atual = achar(where.userId_livroSlug);
        if (atual) return Object.assign(atual, update);
        const vazia = { capitulosLidos: [] as string[], ultimoCapitulo: null, avaliacaoAcertos: null, avaliacaoTotal: null, concluidoEm: null };
        const nova: Linha = Object.assign(vazia, create);
        linhas.push(nova);
        return nova;
      },
    },
  };
}

describe("progresso da leitura", () => {
  it("conta os capítulos lidos e aponta o próximo", () => {
    expect(progressoDoLivro(IDS, [])).toEqual({ lidos: 0, total: 3, leituraCompleta: false, proximo: "c1" });
    expect(progressoDoLivro(IDS, ["c1", "c3"])).toEqual({ lidos: 2, total: 3, leituraCompleta: false, proximo: "c2" });
    expect(progressoDoLivro(IDS, ["c3", "c2", "c1"])).toEqual({ lidos: 3, total: 3, leituraCompleta: true, proximo: null });
  });

  it("ignora capítulos que não existem mais no livro", () => {
    expect(progressoDoLivro(IDS, ["c1", "antigo"]).lidos).toBe(1);
    expect(progressoDoLivro([], ["c1"]).leituraCompleta).toBe(false);
  });
});

describe("avaliação final", () => {
  const avaliacao = [
    { pergunta: "p1", alternativas: ["a", "b"], correta: 1, explicacao: "e1" },
    { pergunta: "p2", alternativas: ["a", "b"], correta: 0, explicacao: "e2" },
    { pergunta: "p3", alternativas: ["a", "b"], correta: 1, explicacao: "e3" },
  ];

  it("exige ao menos 70% de acertos", () => {
    expect(acertosNecessarios(8)).toBe(6);
    expect(acertosNecessarios(10)).toBe(7);
    expect(aprovado(5, 8)).toBe(false);
    expect(aprovado(6, 8)).toBe(true);
    expect(aprovado(null, 8)).toBe(false);
    expect(aprovado(0, 0)).toBe(false);
  });

  it("corrige, conta resposta ausente ou inválida como erro e devolve a explicação", () => {
    const r = corrigirAvaliacao(avaliacao, [1, 0, 0]);
    expect(r.acertos).toBe(2);
    expect(r.aprovado).toBe(false);
    expect(r.correcoes[2]).toEqual({ acertou: false, correta: 1, explicacao: "e3" });
    expect(corrigirAvaliacao(avaliacao, [1, 0, 1]).aprovado).toBe(true);
    expect(corrigirAvaliacao(avaliacao, [null, "0", undefined]).acertos).toBe(0);
  });
});

describe("Selo de Formação", () => {
  it("precisa das duas coisas: leitura completa e avaliação aprovada", () => {
    expect(seloConquistado(true, 6, 8)).toBe(true);
    expect(seloConquistado(false, 8, 8)).toBe(false);
    expect(seloConquistado(true, 5, 8)).toBe(false);
    expect(seloConquistado(true, null, null)).toBe(false);
  });

  it("a frase do perfil muda quando todos os livros foram concluídos", () => {
    expect(fraseDosSelos(1, 7)).toBe("1 selo de formação");
    expect(fraseDosSelos(3, 7)).toBe("3 selos de formação");
    expect(fraseDosSelos(7, 7)).toBe("Formação Completa");
  });

  it("marcar capítulos guarda onde a pessoa parou e não aceita capítulo de fora", async () => {
    const db = banco();
    await marcarCapitulo(db, CHAVE, IDS, "c1", true);
    const leitura = await marcarCapitulo(db, CHAVE, IDS, "c2", true);
    expect(leitura.capitulosLidos).toEqual(["c1", "c2"]);
    expect(leitura.ultimoCapitulo).toBe("c2");
    expect((await marcarCapitulo(db, CHAVE, IDS, "c1", false)).capitulosLidos).toEqual(["c2"]);
    expect(db.linhas).toHaveLength(1);
  });

  it("só concede o selo com leitura completa e aprovação, em qualquer ordem", async () => {
    const db = banco();
    for (const id of IDS) await marcarCapitulo(db, CHAVE, IDS, id, true);
    expect((await leituraDoLivro(db, "rede", "u1", "livro")).concluidoEm).toBeNull();
    expect((await registrarAvaliacao(db, CHAVE, IDS, 5, 8)).concluidoEm).toBeNull();
    expect((await registrarAvaliacao(db, CHAVE, IDS, 7, 8)).concluidoEm).not.toBeNull();
    expect(await selosDaPessoa(db, "rede", "u1")).toBe(1);

    const outro = banco();
    const chave = { ...CHAVE, userId: "u2" };
    await marcarCapitulo(outro, chave, IDS, "c1", true);
    await registrarAvaliacao(outro, chave, IDS, 8, 8);
    expect(await selosDaPessoa(outro, "rede", "u2")).toBe(0);
    await marcarCapitulo(outro, chave, IDS, "c2", true);
    expect((await marcarCapitulo(outro, chave, IDS, "c3", true)).concluidoEm).not.toBeNull();
  });

  it("guarda o melhor resultado e não retira o selo já conquistado", async () => {
    const db = banco();
    for (const id of IDS) await marcarCapitulo(db, CHAVE, IDS, id, true);
    await registrarAvaliacao(db, CHAVE, IDS, 7, 8);
    const depois = await registrarAvaliacao(db, CHAVE, IDS, 2, 8);
    expect(depois.avaliacaoAcertos).toBe(7);
    expect((await marcarCapitulo(db, CHAVE, IDS, "c1", false)).concluidoEm).not.toBeNull();
  });
});

describe("avaliação de cada livro", () => {
  it("todo livro tem avaliação com gabarito válido, e a resposta certa não fica sempre na mesma letra", async () => {
    for (const livro of LIVROS) {
      const avaliacao = (await avaliacaoDoLivro(livro.slug)) ?? [];
      expect(avaliacao.length, livro.slug).toBe(livro.questoes);
      expect(avaliacao.length).toBeGreaterThanOrEqual(8);
      for (const questao of avaliacao) {
        expect(questao.alternativas.length).toBeGreaterThanOrEqual(3);
        expect(new Set(questao.alternativas).size).toBe(questao.alternativas.length);
        expect(questao.correta).toBeGreaterThanOrEqual(0);
        expect(questao.correta).toBeLessThan(questao.alternativas.length);
        expect(questao.explicacao.length).toBeGreaterThan(0);
      }
      // A resposta certa não pode se concentrar em uma letra: nenhuma posição
      // recebe mais da metade das questões, e ao menos três posições são usadas
      const porPosicao = new Map<number, number>();
      for (const questao of avaliacao) porPosicao.set(questao.correta, (porPosicao.get(questao.correta) ?? 0) + 1);
      expect(porPosicao.size, livro.slug).toBeGreaterThanOrEqual(3);
      expect(Math.max(...Array.from(porPosicao.values())), livro.slug).toBeLessThanOrEqual(avaliacao.length / 2);
      // A avaliação fica fora dos capítulos de leitura: o gabarito não aparece no texto
      const capitulos = (await capitulosDoLivro(livro.slug)) ?? [];
      expect(capitulos.some((c) => c.titulo === "Avaliação final")).toBe(false);
    }
  });
});

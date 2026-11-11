import { describe, it, expect } from "vitest";
import { assuntosDaSemana, perguntasSemIA, limparPerguntas, promptDaConversa } from "./conversa-familia";

const nome = (c: string) => ({ MA: "Matemática", CI: "Ciências" } as Record<string, string>)[c] ?? c;
const d = (h: number) => new Date(Date.UTC(2026, 10, 11, h));

describe("conversa da família", () => {
  it("junta os assuntos sem repetir e tira o nome da etapa", () => {
    const a = assuntosDaSemana([
      { quando: d(10), materia: "MA", titulo: "Relembrar: frações", nivel: "MASTERED" },
      { quando: d(11), materia: "MA", titulo: "Praticar: frações", nivel: "NOT_YET" },
      { quando: d(9), materia: "CI", titulo: "Explicar: água poluída", nivel: "ALMOST" },
    ], nome, (t) => t);
    expect(a.map((x) => x.assunto)).toEqual(["frações", "água poluída"]);
    expect(a[0].situacao).toBe("praticando");
  });
  it("perguntas prontas usam o nome e os assuntos", () => {
    const p = perguntasSemIA([{ materia: "Matemática", assunto: "frações", situacao: "praticando" }, { materia: "Ciências", assunto: "água", situacao: "indo_bem" }], "Bia");
    expect(p).toHaveLength(3);
    expect(p[0]).toMatch(/^Bia/);
    expect(p.every((x) => x.endsWith("?"))).toBe(true);
  });
  it("limpa a saída da IA", () => {
    expect(limparPerguntas("1. Onde você vê frações na cozinha?\n- Como explicaria a água poluída?\nTexto solto\n3) O que achou mais difícil?")).toHaveLength(3);
  });
  it("o prompt não leva nome do aluno", () => {
    expect(promptDaConversa([{ materia: "Matemática", assunto: "frações", situacao: "quase" }], 6)).not.toMatch(/Bia|nome do aluno:/);
  });
});

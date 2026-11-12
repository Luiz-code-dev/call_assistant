import { describe, it, expect } from "vitest";
import { apagarDadosPessoais, lerResposta } from "./dever";

describe("foto do dever", () => {
  it("apaga o nome do aluno, mesmo sem acento ou em maiúsculas", () => {
    const t = apagarDadosPessoais("Nome: BEATRIZ Conceição dos Santos\n1) Quanto é 2+2?", "Beatriz Conceicao dos Santos");
    expect(t).not.toMatch(/beatriz|concei|santos/i);
    expect(t).toMatch(/Quanto é 2\+2\?/);
  });
  it("não apaga pedaços de outras palavras", () => {
    expect(apagarDadosPessoais("Ana comprou bananas", "Ana Souza")).toBe("[nome] comprou bananas");
  });
  it("apaga CPF, telefone e e-mail", () => {
    const t = apagarDadosPessoais("CPF 123.456.789-09, tel (71) 98765-4321, mae@email.com", "Bia");
    expect(t).toBe("CPF [documento], tel [telefone], [e-mail]");
  });
  it("lê o JSON da IA e recusa o que não é exercício", () => {
    expect(lerResposta('{"enunciado":"Calcule 3 x 4 e explique.","materia":"Matemática"}')).toEqual({ enunciado: "Calcule 3 x 4 e explique.", materia: "Matemática", ano: null });
    expect(lerResposta('{"enunciado":"10 + 10 = ___","materia":"Matemática","ano":1}')?.ano).toBe(1);
    expect(lerResposta('{"enunciado":"10 + 10 = ___","materia":"Matemática","ano":12}')?.ano).toBeNull();
    expect(lerResposta('{"enunciado":"NAO_E_EXERCICIO","materia":null}')).toBeNull();
    expect(lerResposta("isso não é json")).toBeNull();
    expect(lerResposta('{"enunciado":"Calcule 3 x 4 e explique.","materia":"Química"}')?.materia).toBeNull();
  });
});

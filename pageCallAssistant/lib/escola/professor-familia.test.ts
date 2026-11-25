import { describe, it, expect } from "vitest";
import {
  codigoAgendaDaMateria, validarIndicacao, validarRetorno, nomeDoProfessor, avisoIndicacaoDoProfessor, tituloDoAviso, tipoDoAviso,
  MAX_ALUNOS_POR_ENVIO, MAX_TEXTO_INDICACAO, TIPOS_AVISO, ROTULO_AVISO, DESCRICAO_AVISO,
} from "./professor-familia";

describe("codigoAgendaDaMateria", () => {
  it("acha o código da agenda pelo nome da matéria", () => {
    expect(codigoAgendaDaMateria("Matemática")).toBe("MA");
    expect(codigoAgendaDaMateria("Língua Portuguesa")).toBe("LP");
    expect(codigoAgendaDaMateria("EDUCAÇÃO FÍSICA")).toBe("EF");
    expect(codigoAgendaDaMateria("ci")).toBe("CI");
  });
  it("matéria fora da agenda fica sem código", () => {
    expect(codigoAgendaDaMateria("Robótica")).toBeNull();
    expect(codigoAgendaDaMateria("")).toBeNull();
  });
});

describe("validarIndicacao", () => {
  it("aceita a turma toda e descarta a lista de alunos", () => {
    expect(validarIndicacao({ classSubjectId: "cs1", todos: true, studentIds: ["a"], text: "  Reforçar   frações  " }))
      .toEqual({ classSubjectId: "cs1", todos: true, studentIds: [], text: "Reforçar frações", kind: "REFORCO" });
  });
  it("aceita alunos específicos sem repetir", () => {
    const v = validarIndicacao({ classSubjectId: "cs1", studentIds: ["a", "a", "b"], text: "Reforçar tabuada" });
    expect(v).toEqual({ classSubjectId: "cs1", todos: false, studentIds: ["a", "b"], text: "Reforçar tabuada", kind: "REFORCO" });
  });
  it("recusa sem aluno, sem texto ou com alunos demais", () => {
    expect(validarIndicacao({ classSubjectId: "cs1", text: "Reforçar tabuada" })).toHaveProperty("erro");
    expect(validarIndicacao({ classSubjectId: "cs1", todos: true, text: "oi" })).toHaveProperty("erro");
    expect(validarIndicacao({ todos: true, text: "Reforçar tabuada" })).toHaveProperty("erro");
    const muitos = Array.from({ length: MAX_ALUNOS_POR_ENVIO + 1 }, (_, i) => `s${i}`);
    expect(validarIndicacao({ classSubjectId: "cs1", studentIds: muitos, text: "Reforçar tabuada" })).toHaveProperty("erro");
    expect(validarIndicacao({ classSubjectId: "cs1", todos: true, text: "x".repeat(MAX_TEXTO_INDICACAO + 1) })).toHaveProperty("erro");
  });
});

describe("assunto do aviso", () => {
  it("o professor escolhe o assunto; assunto desconhecido é recusado e aviso antigo vale como reforço", () => {
    expect(validarIndicacao({ classSubjectId: "cs1", todos: true, text: "Parabéns pelo esforço", kind: "elogio" })).toMatchObject({ kind: "ELOGIO" });
    expect(validarIndicacao({ classSubjectId: "cs1", todos: true, text: "Parabéns pelo esforço", kind: "NOTA" })).toHaveProperty("erro");
    expect(tipoDoAviso("TAREFA")).toBe("TAREFA");
    expect(tipoDoAviso(null)).toBe("REFORCO");
  });
  it("todo assunto tem rótulo, descrição e título com o primeiro nome do aluno", () => {
    for (const t of TIPOS_AVISO) {
      expect(ROTULO_AVISO[t]).toBeTruthy();
      expect(DESCRICAO_AVISO[t]).toBeTruthy();
      const titulo = tituloDoAviso(t, "Prof. Ana Souza", "Matemática", "João");
      expect(titulo).toContain("Prof. Ana Souza");
      expect(titulo).toContain("João");
    }
  });
  it("convivência e recado não expõem o assunto na tela bloqueada", () => {
    expect(tituloDoAviso("CONVIVENCIA", "Prof. Ana Souza", "Matemática", "João")).toBe("Prof. Ana Souza mandou um recado sobre João");
    expect(avisoIndicacaoDoProfessor("João Dias", "Matemática", "Prof. Ana Souza", "Parabéns pelo esforço", "s1", "ELOGIO").title)
      .toBe("Prof. Ana Souza mandou um elogio para João");
  });
});

describe("validarRetorno", () => {
  it("aceita elogio, sugestão e preocupação", () => {
    expect(validarRetorno({ classSubjectId: "cs1", kind: "elogio", text: "Professora muito atenciosa" }))
      .toEqual({ classSubjectId: "cs1", kind: "ELOGIO", text: "Professora muito atenciosa" });
    expect(validarRetorno({ classSubjectId: "cs1", kind: "PREOCUPACAO", text: "Meu filho não entende" })).not.toHaveProperty("erro");
  });
  it("recusa tipo desconhecido, texto curto ou sem professor", () => {
    expect(validarRetorno({ classSubjectId: "cs1", kind: "NOTA", text: "texto longo o bastante" })).toHaveProperty("erro");
    expect(validarRetorno({ classSubjectId: "cs1", kind: "ELOGIO", text: "ok" })).toHaveProperty("erro");
    expect(validarRetorno({ kind: "ELOGIO", text: "texto longo o bastante" })).toHaveProperty("erro");
  });
});

describe("nomeDoProfessor e aviso", () => {
  it("mostra o primeiro e o último nome", () => {
    expect(nomeDoProfessor("Ana Maria Souza")).toBe("Prof. Ana Souza");
    expect(nomeDoProfessor("Ana")).toBe("Prof. Ana");
    expect(nomeDoProfessor("")).toBe("Professor(a)");
  });
  it("o aviso leva ao painel do filho e usa só o primeiro nome do aluno", () => {
    const a = avisoIndicacaoDoProfessor("João Bernardo Dias", "Matemática", "Prof. Ana Souza", "Reforçar a tabuada do 7", "s1");
    expect(a.title).toBe("Prof. Ana Souza indicou reforço em Matemática para João");
    expect(a.url).toBe("/escola/familia/s1#professor");
    expect(a.title).not.toContain("Dias");
  });
});

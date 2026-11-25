import { describe, it, expect } from "vitest";
import { diagnosticosRespondidos, diasSemEstudar, fraseSemEstudo, ultimoEstudo } from "./estudo-do-aluno";
import { avisoSemEstudo } from "./avisos-familia";

const agora = new Date("2026-11-25T13:00:00Z"); // quarta, 10h em São Paulo
const haDias = (n: number, hora = 13) => new Date(Date.UTC(2026, 10, 25 - n, hora, 0, 0));

interface Sessao { lastActivityAt: Date; activityId: string; currentQuestion: number; completedAt: Date | null; answers?: Array<{ answeredAt?: string }> }

/** Banco de mentira que aplica os mesmos filtros que as consultas pedem */
function banco(entregas: Array<{ submittedAt: Date | null; status: string }>, sessoes: Sessao[]) {
  const respondida = (s: Sessao, where: { OR?: unknown[] }) => !where.OR || s.currentQuestion > 0 || s.completedAt !== null;
  return {
    eduSubmission: {
      findFirst: async ({ where }: { where: { status?: { not: string } } }) =>
        entregas
          .filter((e) => e.submittedAt && (!where.status || e.status !== where.status.not))
          .sort((a, b) => b.submittedAt!.getTime() - a.submittedAt!.getTime())[0] ?? null,
    },
    eduAttemptSession: {
      findFirst: async ({ where }: { where: { OR?: unknown[] } }) =>
        sessoes.filter((s) => respondida(s, where)).sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())[0] ?? null,
      findMany: async ({ where }: { where: { OR?: unknown[]; lastActivityAt: { gte: Date } } }) =>
        sessoes.filter((s) => respondida(s, where) && s.lastActivityAt.getTime() >= where.lastActivityAt.gte.getTime()),
    },
  };
}

describe("dias sem estudar", () => {
  it("conta dias do calendário de São Paulo, e não blocos de 24 horas", () => {
    expect(diasSemEstudar(haDias(0, 12), agora)).toBe(0);
    // ontem às 23h50 de São Paulo: menos de 24 horas atrás, mas já é "ontem"
    expect(diasSemEstudar(new Date("2026-11-25T02:50:00Z"), agora)).toBe(1);
    expect(diasSemEstudar(haDias(1), agora)).toBe(1);
    expect(diasSemEstudar(haDias(7), agora)).toBe(7);
  });

  it("a frase é uma só para o aviso e para o painel", () => {
    expect(fraseSemEstudo("Bia", 0)).toBeNull();
    expect(fraseSemEstudo("Bia", 1)).toBe("Bia não estuda desde ontem");
    expect(fraseSemEstudo("Bia", 7)).toBe("Bia está há 7 dias sem estudar");
    expect(fraseSemEstudo("Bia", null)).toBe("Bia ainda não começou a estudar");
  });
});

describe("último estudo", () => {
  it("abrir um diagnóstico sem responder não conta como estudo", async () => {
    const db = banco(
      [{ submittedAt: haDias(7), status: "EVALUATED" }],
      [{ lastActivityAt: haDias(1), activityId: "a1", currentQuestion: 0, completedAt: null }],
    );
    const ultimo = await ultimoEstudo(db, "s1");
    expect(ultimo?.toISOString()).toBe(haDias(7).toISOString());
  });

  it("diagnóstico com resposta conta, e rascunho de atividade não conta", async () => {
    const db = banco(
      [{ submittedAt: haDias(0), status: "IN_PROGRESS" }, { submittedAt: haDias(7), status: "EVALUATED" }],
      [{ lastActivityAt: haDias(2), activityId: "a1", currentQuestion: 3, completedAt: null }],
    );
    expect((await ultimoEstudo(db, "s1"))?.toISOString()).toBe(haDias(2).toISOString());
    expect(await diagnosticosRespondidos(db, "s1", haDias(8))).toEqual([{ quando: haDias(2), activityId: "a1" }]);
  });

  it("diagnóstico respondido antes e depois da meia-noite conta os dois dias", async () => {
    // 23h50 de terça e 0h10 de quarta, no horário de São Paulo
    const antes = new Date("2026-11-25T02:50:00Z"), depois = new Date("2026-11-25T03:10:00Z");
    const db = banco([], [{ lastActivityAt: depois, activityId: "a1", currentQuestion: 2, completedAt: null, answers: [{ answeredAt: antes.toISOString() }, { answeredAt: depois.toISOString() }] }]);
    expect(await diagnosticosRespondidos(db, "s1", haDias(8))).toEqual([{ quando: antes, activityId: "a1" }, { quando: depois, activityId: "a1" }]);
  });

  it("respostas anteriores ao período ficam de fora", async () => {
    const db = banco([], [{ lastActivityAt: haDias(1), activityId: "a1", currentQuestion: 2, completedAt: null, answers: [{ answeredAt: haDias(20).toISOString() }, { answeredAt: haDias(1).toISOString() }] }]);
    expect(await diagnosticosRespondidos(db, "s1", haDias(8))).toEqual([{ quando: haDias(1), activityId: "a1" }]);
  });

  it("quem nunca estudou não tem último estudo", async () => {
    expect(await ultimoEstudo(banco([], []), "s1")).toBeNull();
  });
});

describe("o aviso ao responsável diz o mesmo que o painel", () => {
  it("uma semana sem estudar nunca vira 'desde ontem' por causa de um diagnóstico só aberto", async () => {
    const db = banco(
      [{ submittedAt: haDias(7), status: "EVALUATED" }],
      [{ lastActivityAt: haDias(1), activityId: "a1", currentQuestion: 0, completedAt: null }],
    );
    const ultimo = await ultimoEstudo(db, "s1");
    const dias = ultimo ? diasSemEstudar(ultimo, agora) : null;
    const aviso = avisoSemEstudo("Bia Demo", dias, "s1");
    expect(aviso.title).toBe("Bia está há 7 dias sem estudar");
    expect(aviso.title).toBe(fraseSemEstudo("Bia", dias));
  });

  it("quem ainda não estudou recebe a frase de quem não começou", () => {
    expect(avisoSemEstudo("Bia Demo", null, "s1").title).toBe("Bia ainda não começou a estudar");
  });
});

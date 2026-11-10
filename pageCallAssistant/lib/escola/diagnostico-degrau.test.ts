/**
 * Motor do degrau: banco DEGRAU_BANK primeiro, um nível por vez, sem repetir atividade.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClient = vi.hoisted(() => ({
  eduSkill:             { findUnique: vi.fn() },
  eduSkillPrerequisite: { findMany:   vi.fn() },
  eduDiagnosticItem:    { findMany:   vi.fn() },
  eduActivity:          { findMany:   vi.fn() },
}));

vi.mock("@/lib/escola/db", () => ({
  prismaEdu: mockClient,
  setTenantDb: vi.fn(),
  getDb: vi.fn(),
}));

import { calcularDegrau, deveDescerDegrau, findDegrauActivities } from "./diagnostico-degrau";

const p = mockClient;
const base = {
  networkId: "net1", diagnosticId: "DIAG-FRAC-6A-INICIO", studentId: "s1",
  skillCode: "EF06MA07", currentItemCount: 8, currentMinutes: 16,
};

beforeEach(() => {
  vi.clearAllMocks();
  p.eduSkill.findUnique.mockResolvedValue({ id: "sk-EF06MA07" });
  p.eduSkillPrerequisite.findMany.mockResolvedValue([
    { weight: 3, prerequisiteSkill: { id: "sk-EF05MA04", code: "EF05MA04" } },
  ]);
  p.eduDiagnosticItem.findMany.mockResolvedValue([
    { activityId: "BANK-1", activity: { estMinutes: 2 } },
    { activityId: "BANK-2", activity: { estMinutes: 2 } },
  ]);
  p.eduActivity.findMany.mockResolvedValue([{ id: "TRILHA-1", estMinutes: 4 }]);
});

describe("findDegrauActivities", () => {
  it("usa os itens DEGRAU_BANK do próprio diagnóstico antes de qualquer outra atividade", async () => {
    const r = await findDegrauActivities("net1", "sk-EF05MA04", "DIAG-FRAC-6A-INICIO", new Set(), 2);
    expect(r.map((a) => a.id)).toEqual(["BANK-1", "BANK-2"]);
    expect(p.eduDiagnosticItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { diagnosticId: "DIAG-FRAC-6A-INICIO", skillId: "sk-EF05MA04", role: "DEGRAU_BANK", isDegrauLegacy: false },
    }));
    expect(p.eduActivity.findMany).not.toHaveBeenCalled();
  });

  it("não repete atividade que já está na sessão e completa com outra atividade da habilidade", async () => {
    const r = await findDegrauActivities("net1", "sk-EF05MA04", "D", new Set(["BANK-1"]), 2);
    expect(r.map((a) => a.id)).toEqual(["BANK-2", "TRILHA-1"]);
  });

  it("sem banco do degrau, usa só atividades de quiz publicadas", async () => {
    p.eduDiagnosticItem.findMany.mockResolvedValue([]);
    const r = await findDegrauActivities("net1", "sk-EF05MA04", "D", new Set(), 2);
    expect(r.map((a) => a.id)).toEqual(["TRILHA-1"]);
    expect(p.eduActivity.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ type: "QUIZ", status: "PUBLISHED", skillIds: { has: "sk-EF05MA04" } }),
    }));
  });
});

describe("calcularDegrau", () => {
  it("desce um nível só, com 2 questões do pré-requisito de maior peso", async () => {
    const r = await calcularDegrau(base);
    expect(r.added).toEqual([
      { activityId: "BANK-1", skillCode: "EF05MA04", degrau: 1 },
      { activityId: "BANK-2", skillCode: "EF05MA04", degrau: 1 },
    ]);
    expect(p.eduSkillPrerequisite.findMany).toHaveBeenCalledTimes(1);
  });

  it("marca o nível pedido (segundo degrau)", async () => {
    const r = await calcularDegrau({ ...base, skillCode: "EF05MA04", nivel: 2 });
    expect(r.added.every((a) => a.degrau === 2)).toBe(true);
  });

  it("não passa de 2 degraus", async () => {
    const r = await calcularDegrau({ ...base, nivel: 3 });
    expect(r.added).toHaveLength(0);
    expect(p.eduSkill.findUnique).not.toHaveBeenCalled();
  });

  it("respeita o limite de 20 questões", async () => {
    expect((await calcularDegrau({ ...base, currentItemCount: 20 })).added).toHaveLength(0);
    expect((await calcularDegrau({ ...base, currentItemCount: 19 })).added).toHaveLength(1);
  });

  it("respeita o limite de 25 minutos", async () => {
    expect((await calcularDegrau({ ...base, currentMinutes: 25 })).added).toHaveLength(0);
  });

  it("pula o pré-requisito sem questões e usa o seguinte", async () => {
    p.eduSkillPrerequisite.findMany.mockResolvedValue([
      { weight: 3, prerequisiteSkill: { id: "sk-vazio", code: "EF05MA99" } },
      { weight: 2, prerequisiteSkill: { id: "sk-EF05MA03", code: "EF05MA03" } },
    ]);
    p.eduDiagnosticItem.findMany.mockImplementation(({ where }: { where: { skillId: string } }) =>
      Promise.resolve(where.skillId === "sk-EF05MA03" ? [{ activityId: "BANK-3", activity: { estMinutes: 2 } }] : []));
    p.eduActivity.findMany.mockResolvedValue([]);
    const r = await calcularDegrau(base);
    expect(r.prereqs.map((x) => x.skillCode)).toEqual(["EF05MA03"]);
    expect(r.added.map((a) => a.activityId)).toEqual(["BANK-3"]);
  });

  it("prefere o pré-requisito com banco do degrau ao de maior peso sem banco (EF06MA10 -> EF05MA04)", async () => {
    p.eduSkillPrerequisite.findMany.mockResolvedValue([
      { weight: 3, prerequisiteSkill: { id: "sk-EF06MA07", code: "EF06MA07" } },
      { weight: 2, prerequisiteSkill: { id: "sk-EF05MA04", code: "EF05MA04" } },
    ]);
    p.eduDiagnosticItem.findMany.mockImplementation(({ where }: { where: { skillId: string } }) =>
      Promise.resolve(where.skillId === "sk-EF05MA04"
        ? [{ activityId: "BANK-EF05MA04-1", activity: { estMinutes: 2 } }, { activityId: "BANK-EF05MA04-2", activity: { estMinutes: 2 } }]
        : []));
    p.eduActivity.findMany.mockResolvedValue([{ id: "TRILHA-EF06MA07", estMinutes: 4 }]);
    const r = await calcularDegrau({ ...base, skillCode: "EF06MA10" });
    expect(r.prereqs.map((x) => x.skillCode)).toEqual(["EF05MA04"]);
    expect(r.added.map((a) => a.activityId)).toEqual(["BANK-EF05MA04-1", "BANK-EF05MA04-2"]);
  });

  it("sem banco em nenhum pré-requisito, usa atividade do de maior peso", async () => {
    p.eduDiagnosticItem.findMany.mockResolvedValue([]);
    const r = await calcularDegrau(base);
    expect(r.added).toEqual([{ activityId: "TRILHA-1", skillCode: "EF05MA04", degrau: 1 }]);
  });

  it("habilidade inexistente não adiciona nada", async () => {
    p.eduSkill.findUnique.mockResolvedValue(null);
    expect((await calcularDegrau(base)).added).toHaveLength(0);
  });
});

describe("deveDescerDegrau", () => {
  const erro = { acertou: false, temErroComum: false, errosNaHabilidade: 1, nivelAtual: 0, jaDesceuDestaHabilidade: false };

  it("1 erro sem erro comum não desce", () => {
    expect(deveDescerDegrau(erro)).toBe(false);
  });
  it("1 erro marcando alternativa com erro comum desce", () => {
    expect(deveDescerDegrau({ ...erro, temErroComum: true })).toBe(true);
  });
  it("2 erros na habilidade descem", () => {
    expect(deveDescerDegrau({ ...erro, errosNaHabilidade: 2 })).toBe(true);
  });
  it("acerto nunca desce", () => {
    expect(deveDescerDegrau({ ...erro, acertou: true, temErroComum: true, errosNaHabilidade: 2 })).toBe(false);
  });
  it("não desce duas vezes da mesma habilidade", () => {
    expect(deveDescerDegrau({ ...erro, errosNaHabilidade: 2, jaDesceuDestaHabilidade: true })).toBe(false);
  });
  it("erro no primeiro degrau desce mais um; no segundo, para", () => {
    expect(deveDescerDegrau({ ...erro, errosNaHabilidade: 2, nivelAtual: 1 })).toBe(true);
    expect(deveDescerDegrau({ ...erro, errosNaHabilidade: 2, nivelAtual: 2 })).toBe(false);
  });
});

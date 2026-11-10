/**
 * Testes de aceite para o serviço de regras de atribuição de trilhas.
 * Usa vitest com mocks manuais do Prisma.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted garante que mockClient seja definido ANTES do vi.mock ser hoistado
const mockClient = vi.hoisted(() => ({
  eduTrack:            { findUnique: vi.fn() },
  eduSkillMastery:     { findMany:   vi.fn() },
  eduTrackAssignment:  { findMany:   vi.fn(), createMany: vi.fn() },
}));

vi.mock("@/lib/escola/db", () => ({
  prismaEdu: mockClient,
  setTenantDb: vi.fn(),
  getDb: vi.fn(),
}));

import { assignTrackToStudents } from "./track-assignment";

const p = mockClient;

const TRACK_ID = "track1";
const NETWORK_ID = "net1";
const ASSIGNED_BY = "teacher1";
const SKILL_A = "skill_A";
const SKILL_B = "skill_B";

function baseTrack(overrides = {}) {
  return { id: TRACK_ID, status: "APPROVED", subjectId: "subj1", skillIds: [SKILL_A, SKILL_B], ...overrides };
}
function baseInput(overrides: Record<string, unknown> = {}) {
  return { networkId: NETWORK_ID, trackId: TRACK_ID, studentIds: ["s1", "s2", "s3"], assignedBy: ASSIGNED_BY, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.eduTrack.findUnique.mockResolvedValue(baseTrack());
  p.eduSkillMastery.findMany.mockResolvedValue([]);
  p.eduTrackAssignment.findMany.mockResolvedValue([]);
  p.eduTrackAssignment.createMany.mockResolvedValue({ count: 0 });
});

describe("assignTrackToStudents — regras", () => {
  it("atribui todos quando não há impedimentos", async () => {
    const r = await assignTrackToStudents(baseInput());
    expect(r.atribuidos).toBe(3);
    expect(r.pulados).toHaveLength(0);
    expect(p.eduTrackAssignment.createMany).toHaveBeenCalledTimes(1);
  });

  it("rejeita trilha não aprovada (DRAFT)", async () => {
    p.eduTrack.findUnique.mockResolvedValue(baseTrack({ status: "DRAFT" }));
    await expect(assignTrackToStudents(baseInput())).rejects.toThrow("não está aprovada");
  });

  it("rejeita trilha inexistente (null)", async () => {
    p.eduTrack.findUnique.mockResolvedValue(null);
    await expect(assignTrackToStudents(baseInput())).rejects.toThrow(/não encontrada|não está aprovada/);
  });

  it("aceita trilha da biblioteca SpeakFlow (networkId null)", async () => {
    p.eduTrack.findUnique.mockResolvedValue(baseTrack({ networkId: null, subjectCode: "MA" }));
    const r = await assignTrackToStudents(baseInput());
    expect(r.atribuidos).toBe(3);
  });

  it("rejeita trilha de outra rede", async () => {
    p.eduTrack.findUnique.mockResolvedValue(baseTrack({ networkId: "outra-rede" }));
    await expect(assignTrackToStudents(baseInput())).rejects.toThrow("não encontrada");
    expect(p.eduTrackAssignment.createMany).not.toHaveBeenCalled();
  });

  it("limite de 3 por componente usa subjectCode quando a trilha é da biblioteca", async () => {
    p.eduTrack.findUnique.mockResolvedValue(baseTrack({ networkId: null, subjectId: null, subjectCode: "CI" }));
    p.eduTrackAssignment.findMany.mockResolvedValue([
      { studentId: "s1", trackId: "t_ma1", track: { subjectId: null, subjectCode: "MA" } },
      { studentId: "s1", trackId: "t_ma2", track: { subjectId: null, subjectCode: "MA" } },
      { studentId: "s1", trackId: "t_ma3", track: { subjectId: null, subjectCode: "MA" } },
      { studentId: "s2", trackId: "t_ci1", track: { subjectId: null, subjectCode: "CI" } },
      { studentId: "s2", trackId: "t_ci2", track: { subjectId: null, subjectCode: "CI" } },
      { studentId: "s2", trackId: "t_ci3", track: { subjectId: null, subjectCode: "CI" } },
    ]);
    const r = await assignTrackToStudents(baseInput());
    // s1 tem 3 de Matemática, mas a trilha é de Ciências: recebe
    // s2 já tem 3 de Ciências: pulado
    expect(r.atribuidos).toBe(2);
    expect(r.pulados).toEqual([{ studentId: "s2", motivo: expect.stringContaining("3 trilhas") }]);
  });

  it("trilha concluída não ocupa vaga no limite de 3", async () => {
    p.eduTrack.findUnique.mockResolvedValue(baseTrack({ networkId: null, subjectId: null, subjectCode: "CI" }));
    const feita = [{ studentId: "s2", completedAt: new Date() }];
    p.eduTrackAssignment.findMany.mockResolvedValue([
      { studentId: "s2", trackId: "t_ci1", track: { subjectId: null, subjectCode: "CI" }, progress: feita },
      { studentId: "s2", trackId: "t_ci2", track: { subjectId: null, subjectCode: "CI" } },
      { studentId: "s2", trackId: "t_ci3", track: { subjectId: null, subjectCode: "CI" } },
    ]);
    const r = await assignTrackToStudents(baseInput());
    expect(r.pulados).toEqual([]);
  });

  it("trilha da base entra mesmo com 3 ativas no componente (ignorarLimite)", async () => {
    p.eduTrack.findUnique.mockResolvedValue(baseTrack({ networkId: null, subjectId: null, subjectCode: "CI" }));
    p.eduTrackAssignment.findMany.mockResolvedValue([
      { studentId: "s2", trackId: "t_ci1", track: { subjectId: null, subjectCode: "CI" } },
      { studentId: "s2", trackId: "t_ci2", track: { subjectId: null, subjectCode: "CI" } },
      { studentId: "s2", trackId: "t_ci3", track: { subjectId: null, subjectCode: "CI" } },
    ]);
    const r = await assignTrackToStudents({ ...baseInput(), ignorarLimite: true });
    expect(r.pulados).toEqual([]);
  });

  it("pula aluno com a mesma trilha já ativa", async () => {
    p.eduTrackAssignment.findMany.mockResolvedValue([
      { studentId: "s1", trackId: TRACK_ID, track: { subjectId: "subj1" } },
    ]);
    const r = await assignTrackToStudents(baseInput());
    expect(r.atribuidos).toBe(2);
    expect(r.pulados).toHaveLength(1);
    expect(r.pulados[0]).toMatchObject({ studentId: "s1", motivo: expect.stringContaining("trilha ativa") });
  });

  it("pula aluno com 3 trilhas ativas no mesmo componente", async () => {
    p.eduTrackAssignment.findMany.mockResolvedValue([
      { studentId: "s2", trackId: "t_a", track: { subjectId: "subj1" } },
      { studentId: "s2", trackId: "t_b", track: { subjectId: "subj1" } },
      { studentId: "s2", trackId: "t_c", track: { subjectId: "subj1" } },
    ]);
    const r = await assignTrackToStudents(baseInput());
    expect(r.atribuidos).toBe(2);
    expect(r.pulados.find((pp: { studentId: string }) => pp.studentId === "s2")?.motivo).toContain("3 trilhas ativas");
  });

  it("pula aluno que já domina todas as habilidades", async () => {
    p.eduSkillMastery.findMany.mockResolvedValue([
      { studentId: "s3", skillId: SKILL_A, level: "MASTERED" },
      { studentId: "s3", skillId: SKILL_B, level: "MASTERED" },
    ]);
    const r = await assignTrackToStudents(baseInput());
    expect(r.atribuidos).toBe(2);
    expect(r.pulados.find((pp: { studentId: string }) => pp.studentId === "s3")?.motivo).toContain("domina");
  });

  it("atribui mesmo a quem Domina quando force=true", async () => {
    p.eduSkillMastery.findMany.mockResolvedValue([
      { studentId: "s3", skillId: SKILL_A, level: "MASTERED" },
      { studentId: "s3", skillId: SKILL_B, level: "MASTERED" },
    ]);
    const r = await assignTrackToStudents(baseInput({ force: true }));
    expect(r.atribuidos).toBe(3);
    expect(r.pulados).toHaveLength(0);
  });

  it("não grava nada quando todos são pulados (duplicata)", async () => {
    p.eduTrackAssignment.findMany.mockResolvedValue([
      { studentId: "s1", trackId: TRACK_ID, track: { subjectId: "subj1" } },
      { studentId: "s2", trackId: TRACK_ID, track: { subjectId: "subj1" } },
      { studentId: "s3", trackId: TRACK_ID, track: { subjectId: "subj1" } },
    ]);
    const r = await assignTrackToStudents(baseInput());
    expect(r.atribuidos).toBe(0);
    expect(p.eduTrackAssignment.createMany).not.toHaveBeenCalled();
  });

  it("aluno em Quase lá não é pulado sem force", async () => {
    p.eduSkillMastery.findMany.mockResolvedValue([
      { studentId: "s1", skillId: SKILL_A, level: "ALMOST" },
    ]);
    const r = await assignTrackToStudents({ ...baseInput(), studentIds: ["s1"] });
    expect(r.atribuidos).toBe(1);
    expect(r.pulados).toHaveLength(0);
  });
});

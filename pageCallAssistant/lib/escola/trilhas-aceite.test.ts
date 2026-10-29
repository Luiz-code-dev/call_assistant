/**
 * test(escola-trilhas): aceite ponta a ponta — rede Vila Esperanca
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClient = vi.hoisted(() => ({
  eduTrack:           { findUnique: vi.fn() },
  eduSkillMastery:    { findMany: vi.fn() },
  eduTrackAssignment: { findMany: vi.fn(), createMany: vi.fn() },
}));

vi.mock("@/lib/escola/db", () => ({
  prismaEdu: mockClient,
  setTenantDb: vi.fn(),
  getDb: vi.fn(),
}));

import { assignTrackToStudents } from "./track-assignment";

const p = mockClient;

const BASE_TRACK = {
  id: "track-ef06ma07",
  status: "APPROVED",
  subjectId: "mat",
  skillIds: ["skill-ef06ma07"],
};

beforeEach(() => {
  vi.clearAllMocks();
  p.eduTrack.findUnique.mockResolvedValue(BASE_TRACK);
  p.eduSkillMastery.findMany.mockResolvedValue([]);
  p.eduTrackAssignment.findMany.mockResolvedValue([]);
  p.eduTrackAssignment.createMany.mockResolvedValue({ count: 1 });
});

describe("Aceite — Vila Esperança", () => {
  it("rejeita trilha inexistente", async () => {
    p.eduTrack.findUnique.mockResolvedValue(null);
    await expect(
      assignTrackToStudents({ networkId: "rede-ve", trackId: "nao-existe", studentIds: ["s1"], assignedBy: "prof" })
    ).rejects.toThrow(/não encontrada|não está aprovada/);
  });

  it("rejeita trilha em DRAFT", async () => {
    p.eduTrack.findUnique.mockResolvedValue({ ...BASE_TRACK, status: "DRAFT" });
    await expect(
      assignTrackToStudents({ networkId: "rede-ve", trackId: "track-ef06ma07", studentIds: ["s1"], assignedBy: "prof" })
    ).rejects.toThrow(/aprovada/);
  });

  it("pula aluno que ja domina todas as habilidades da trilha", async () => {
    p.eduSkillMastery.findMany.mockResolvedValue([
      { studentId: "ana", skillId: "skill-ef06ma07", level: "MASTERED" },
    ]);
    const result = await assignTrackToStudents({
      networkId: "rede-ve", trackId: "track-ef06ma07", studentIds: ["ana"], assignedBy: "prof",
    });
    expect(result.atribuidos).toBe(0);
    expect(result.pulados).toHaveLength(1);
    expect(result.pulados[0].motivo).toMatch(/domina/i);
  });

  it("com force=true atribui mesmo a quem ja domina", async () => {
    p.eduSkillMastery.findMany.mockResolvedValue([
      { studentId: "ana", skillId: "skill-ef06ma07", level: "MASTERED" },
    ]);
    const result = await assignTrackToStudents({
      networkId: "rede-ve", trackId: "track-ef06ma07", studentIds: ["ana"], assignedBy: "prof", force: true,
    });
    expect(result.atribuidos).toBe(1);
    expect(result.pulados).toHaveLength(0);
    expect(p.eduTrackAssignment.createMany).toHaveBeenCalledOnce();
  });

  it("pula aluno que ja tem esta trilha ativa (duplicada)", async () => {
    p.eduTrackAssignment.findMany.mockResolvedValue([
      { studentId: "pedro", trackId: "track-ef06ma07", track: { subjectId: "mat" } },
    ]);
    const result = await assignTrackToStudents({
      networkId: "rede-ve", trackId: "track-ef06ma07", studentIds: ["pedro"], assignedBy: "prof",
    });
    expect(result.atribuidos).toBe(0);
    expect(result.pulados[0].motivo).toMatch(/trilha ativa|duplicad/i);
  });

  it("pula aluno com 3 ou mais trilhas ativas no mesmo componente (limite)", async () => {
    p.eduTrackAssignment.findMany.mockResolvedValue([
      { studentId: "joao", trackId: "outro-1", track: { subjectId: "mat" } },
      { studentId: "joao", trackId: "outro-2", track: { subjectId: "mat" } },
      { studentId: "joao", trackId: "outro-3", track: { subjectId: "mat" } },
    ]);
    const result = await assignTrackToStudents({
      networkId: "rede-ve", trackId: "track-ef06ma07", studentIds: ["joao"], assignedBy: "prof",
    });
    expect(result.atribuidos).toBe(0);
    expect(result.pulados[0].motivo).toMatch(/3 trilhas|limite/i);
  });

  it("dryRun=true calcula sem gravar no banco", async () => {
    const result = await assignTrackToStudents({
      networkId: "rede-ve", trackId: "track-ef06ma07", studentIds: ["maria"], assignedBy: "prof", dryRun: true,
    });
    expect(result.atribuidos).toBe(1);
    expect(p.eduTrackAssignment.createMany).not.toHaveBeenCalled();
  });

  it("preview (dryRun) com mix de alunos: atribuidos e pulados, sem gravar", async () => {
    p.eduSkillMastery.findMany.mockResolvedValue([
      { studentId: "ana", skillId: "skill-ef06ma07", level: "MASTERED" },
    ]);
    p.eduTrackAssignment.findMany.mockResolvedValue([
      { studentId: "pedro", trackId: "track-ef06ma07", track: { subjectId: "mat" } },
    ]);
    const result = await assignTrackToStudents({
      networkId: "rede-ve", trackId: "track-ef06ma07",
      studentIds: ["ana", "pedro", "maria"], assignedBy: "prof", dryRun: true,
    });
    expect(result.atribuidos).toBe(1);
    expect(result.pulados).toHaveLength(2);
    expect(p.eduTrackAssignment.createMany).not.toHaveBeenCalled();
  });

  it("atribuicao normal: grava e retorna N atribuidos", async () => {
    const result = await assignTrackToStudents({
      networkId: "rede-ve", trackId: "track-ef06ma07",
      studentIds: ["ana", "pedro", "maria"], assignedBy: "prof",
    });
    expect(result.atribuidos).toBe(3);
    expect(result.pulados).toHaveLength(0);
    expect(p.eduTrackAssignment.createMany).toHaveBeenCalledOnce();
    expect(p.eduTrackAssignment.createMany.mock.calls[0][0].data).toHaveLength(3);
  });
});

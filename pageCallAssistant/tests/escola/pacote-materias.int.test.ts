/**
 * pacote-materias.int.test.ts
 *
 * Com o banco do CI (start.sh já rodou: BNCC, conteudo-pacote-import e seeds demo).
 * Chama as rotas de verdade. Só a leitura do cookie é substituída: getStudentContext
 * devolve o aluno do seed, com o cliente Prisma da base dele. Nenhum usuário da
 * escola participa.
 *
 *   - 2.1: nenhuma resposta enviada ao aluno contém misconceptionCode nem correctIndex
 *   - /materias: 9 componentes para o 6º B e 8 para o 5º A, todos "disponivel"
 *   - degrau: "2/5" em "1/2 + 1/3" -> 2 questões de EF05MA04 logo em seguida;
 *     errando, 2 de EF04MA09; habilidade de partida EF04MA09 e trilha atribuída
 *   - outro aluno do 6º B não recebe o degrau do primeiro
 *   - Português depois de Matemática: as duas trilhas ficam ativas
 *   - cobertura: cada componente do 5º e 6º tem diagnóstico APPROVED com 2
 *     habilidades e, no 6º, banco do degrau
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/escolas";

type Ctx = { studentId: string; networkId: string; enrollmentId: string; classId: string; db: PrismaClient };
const estado = vi.hoisted(() => ({ ctx: null as unknown, familia: null as unknown }));

vi.mock("@/lib/escola/context", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/escola/context")>();
  return { ...real, getStudentContext: vi.fn(async () => estado.ctx) };
});

vi.mock("@/lib/escola/family-context", () => ({ getFamilyContext: vi.fn(async () => estado.familia) }));

import { GET as getMaterias } from "@/app/api/escola/aluno/materias/route";
import { GET as getFamiliaMaterias } from "@/app/api/escola/familia/filhos/[studentId]/materias/route";
import { POST as postSessao } from "@/app/api/escola/aluno/diagnostico/sessao/route";
import { GET as getAtividades } from "@/app/api/escola/aluno/atividades/route";

const URL_A = process.env.ESCOLAS_DB_01_URL ?? "";
const URL_B = process.env.ESCOLAS_DB_02_URL ?? "";
const dbA = new PrismaClient({ datasources: { db: { url: URL_A } } });
const dbB = new PrismaClient({ datasources: { db: { url: URL_B } } });

const SEGREDO = /misconceptionCode|correctIndex/;
const COMPONENTES_5 = ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "ER"];
const COMPONENTES_6 = [...COMPONENTES_5, "LI"];

let alunoB: Ctx;      // Aluno Demo B Santos, 6º B
let colegaB: Ctx;     // segundo aluno criado no 6º B, só para o teste de isolamento
let alunoA: Ctx;      // Aluno Demo Silva, 5º A
const inicioDoTeste = new Date();

async function ctxDoSeed(db: PrismaClient, studentId: string): Promise<Ctx> {
  const enr = await db.eduEnrollment.findFirst({ where: { studentId, status: "ACTIVE" } });
  if (!enr) throw new Error(`aluno ${studentId} sem matrícula ativa no seed`);
  return { studentId, networkId: enr.networkId, enrollmentId: enr.id, classId: enr.classId, db };
}

/** Apaga só o reforço do aluno (base local do CI) */
async function limparReforco(c: Ctx) {
  await c.db.eduAttemptSession.deleteMany({ where: { studentId: c.studentId } });
  await c.db.eduTrackAssignment.deleteMany({ where: { studentId: c.studentId } });
  await c.db.eduSkillMasteryEvent.deleteMany({ where: { studentId: c.studentId } });
  await c.db.eduSkillMastery.deleteMany({ where: { studentId: c.studentId } });
}

async function json(res: Response) {
  const texto = await res.text();
  return { status: res.status, texto, body: texto ? JSON.parse(texto) : null };
}

async function materias(c: Ctx) {
  estado.ctx = c;
  return json(await getMaterias());
}

async function sessao(c: Ctx, body: Record<string, unknown>) {
  estado.ctx = c;
  const req = new NextRequest("http://localhost/api/escola/aluno/diagnostico/sessao", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return json(await postSessao(req));
}

/** A questão no banco (o navegador não recebe a resposta certa) */
async function gabarito(c: Ctx, questionId: string) {
  const q = await c.db.eduQuizQuestion.findUnique({ where: { id: questionId } });
  if (!q) throw new Error(`questão ${questionId} não encontrada`);
  const opcoes = (q.options as Array<string | { text: string; misconceptionCode?: string }>).map((o) =>
    typeof o === "string" ? { text: o } : o);
  return { correctIndex: q.correctIndex, opcoes };
}

type Passo = { skillCode: string; isDegrau: boolean; question: string };

/**
 * Responde o diagnóstico inteiro. escolha(questão, gabarito) devolve o índice marcado.
 * Confere em toda resposta que nada secreto foi ao navegador.
 */
async function responderTudo(
  c: Ctx,
  diagnosticId: string,
  escolha: (p: Passo, g: { correctIndex: number; opcoes: Array<{ text: string; misconceptionCode?: string }> }) => number,
) {
  const ini = await sessao(c, { action: "iniciar", diagnosticId });
  expect(ini.status, ini.texto).toBe(200);
  expect(ini.texto).not.toMatch(SEGREDO);
  let atual = ini.body;
  const sessionId = ini.body.sessionId as string;
  const passos: Passo[] = [];
  for (let guarda = 0; guarda < 30; guarda++) {
    const atividade = atual.atividade;
    const q = atividade.questions[0];
    const passo = { skillCode: atividade.skillCode, isDegrau: !!atividade.isDegrau, question: q.question };
    passos.push(passo);
    const idx = escolha(passo, await gabarito(c, q.id));
    const r = await sessao(c, { action: "responder", sessionId, selectedIndex: idx, elapsedMs: 6000 });
    expect(r.status, r.texto).toBe(200);
    expect(r.texto).not.toMatch(SEGREDO);
    if (r.body.concluido) return { passos, final: r.body, sessionId };
    atual = r.body;
  }
  throw new Error("diagnóstico não terminou em 30 respostas");
}

const errada = (g: { correctIndex: number; opcoes: Array<{ misconceptionCode?: string }> }) => {
  const i = g.opcoes.findIndex((o, k) => k !== g.correctIndex && o.misconceptionCode);
  return i >= 0 ? i : (g.correctIndex + 1) % g.opcoes.length;
};

beforeAll(async () => {
  for (const u of [URL_A, URL_B]) {
    if (!/127\.0\.0\.1|localhost/.test(u)) throw new Error("este teste apaga dados de reforço: só roda contra banco local do CI");
  }
  alunoB = await ctxDoSeed(dbB, "aluno-demo-rede-b");
  alunoA = await ctxDoSeed(dbA, "aluno-demo-rede-a");

  const colega = await dbB.eduStudent.upsert({
    where: { id: "teste-colega-6b" },
    create: { id: "teste-colega-6b", networkId: alunoB.networkId, enrollmentCode: "TESTE6B2", fullName: "Colega Teste 6B", pinHash: "x", isActive: true },
    update: { isActive: true },
  });
  const enrB = await dbB.eduEnrollment.findUniqueOrThrow({ where: { id: alunoB.enrollmentId } });
  await dbB.eduEnrollment.upsert({
    where: { id: "teste-enroll-colega-6b" },
    create: { id: "teste-enroll-colega-6b", networkId: alunoB.networkId, studentId: colega.id, classId: enrB.classId, schoolYearId: enrB.schoolYearId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });
  colegaB = await ctxDoSeed(dbB, colega.id);

  for (const c of [alunoB, colegaB, alunoA]) await limparReforco(c);
});

afterAll(async () => {
  await dbA.$disconnect();
  await dbB.$disconnect();
});

describe("Minhas matérias", () => {
  it("6º B vê as 9 matérias do 6º ano, todas disponíveis", async () => {
    const r = await materias(alunoB);
    expect(r.status, r.texto).toBe(200);
    expect(r.body.gradeYear).toBe(6);
    expect(r.body.materias.map((m: { codigo: string }) => m.codigo).sort()).toEqual([...COMPONENTES_6].sort());
    for (const m of r.body.materias) expect(m.estado, m.codigo).toBe("disponivel");
  });

  it("5º A vê as 8 matérias do 5º ano, todas disponíveis", async () => {
    const r = await materias(alunoA);
    expect(r.status, r.texto).toBe(200);
    expect(r.body.gradeYear).toBe(5);
    expect(r.body.materias.map((m: { codigo: string }) => m.codigo).sort()).toEqual([...COMPONENTES_5].sort());
    for (const m of r.body.materias) expect(m.estado, m.codigo).toBe("disponivel");
  });
});

describe("2.1 — o navegador nunca recebe misconceptionCode nem correctIndex", () => {
  it("início de todos os diagnósticos do 6º e do 5º", async () => {
    for (const c of [alunoB, alunoA]) {
      const r = await materias(c);
      for (const m of r.body.materias) {
        const ini = await sessao(c, { action: "iniciar", diagnosticId: m.diagnosticoId });
        expect(ini.status, `${m.codigo}: ${ini.texto}`).toBe(200);
        expect(ini.texto, m.codigo).not.toMatch(SEGREDO);
        expect(ini.body.atividade.questions[0].options.every((o: unknown) => typeof (o as { text?: unknown }).text === "string")).toBe(true);
      }
      await limparReforco(c);
    }
  });

  it("lista de atividades do aluno", async () => {
    estado.ctx = alunoB;
    const r = await json(await getAtividades(new NextRequest("http://localhost/api/escola/aluno/atividades")));
    expect(r.status, r.texto).toBe(200);
    expect(r.texto).not.toMatch(SEGREDO);
  });
});

describe("Degrau por aluno — Matemática do 6º B", () => {
  let resultadoMA: { passos: Passo[]; final: Record<string, unknown> };

  it("2/5 em 1/2 + 1/3: 2 questões de EF05MA04 logo em seguida; errando, 2 de EF04MA09", async () => {
    const r = await materias(alunoB);
    const ma = r.body.materias.find((m: { codigo: string }) => m.codigo === "MA");
    resultadoMA = await responderTudo(alunoB, ma.diagnosticoId, (p, g) => {
      if (/1\/2 \+ 1\/3/.test(p.question)) {
        const i = g.opcoes.findIndex((o) => o.text.trim() === "2/5");
        expect(i, "alternativa 2/5").toBeGreaterThanOrEqual(0);
        return i;
      }
      if (p.isDegrau) return errada(g);
      return g.correctIndex;
    });

    const k = resultadoMA.passos.findIndex((p) => /1\/2 \+ 1\/3/.test(p.question));
    expect(k).toBeGreaterThanOrEqual(0);
    const depois = resultadoMA.passos.slice(k + 1, k + 5).map((p) => `${p.skillCode}${p.isDegrau ? "*" : ""}`);
    expect(depois).toEqual(["EF05MA04*", "EF05MA04*", "EF04MA09*", "EF04MA09*"]);
  });

  it("resultado: habilidade de partida EF04MA09 e trilha atribuída antes da resposta", async () => {
    type H = { code: string; tituloAluno: string; ano: number | null };
    const final = resultadoMA.final as {
      resultado: { habilidadePartida: H | null; degrau: H[]; erroComum: { texto: string } | null };
      trilha: { id: string } | null;
    };
    const ef04ma09 = await dbB.eduSkill.findUniqueOrThrow({ where: { code: "EF04MA09" } });
    expect(final.resultado.habilidadePartida?.code).toBe("EF04MA09");
    expect(final.resultado.habilidadePartida?.tituloAluno, "título para o aluno").toBeTruthy();
    expect(final.resultado.degrau.map((h) => h.code).slice(-2)).toEqual(["EF05MA04", "EF04MA09"]);
    expect(final.resultado.degrau[0].code.startsWith("EF06"), "o caminho começa no 6º ano").toBe(true);
    // O aluno vê a explicação do erro, nunca o código (ex.: soma-num-e-den-separado)
    expect(final.resultado.erroComum?.texto, "texto do erro comum").toBeTruthy();
    expect(JSON.stringify(final.resultado)).not.toMatch(/"[a-z]+(-[a-z0-9]+){2,}"/);
    expect(final.trilha, "trilha na resposta").not.toBeNull();
    const ativas = await dbB.eduTrackAssignment.findMany({ where: { studentId: alunoB.studentId, endedAt: null }, include: { track: true } });
    expect(ativas.some((a) => a.track.skillIds.includes(ef04ma09.id))).toBe(true);
    expect(ativas.every((a) => a.assignedBy === "system")).toBe(true);
  });

  it("outro aluno do 6º B não vê as questões de degrau do primeiro", async () => {
    const r = await materias(colegaB);
    const ma = r.body.materias.find((m: { codigo: string }) => m.codigo === "MA");
    const ini = await sessao(colegaB, { action: "iniciar", diagnosticId: ma.diagnosticoId });
    expect(ini.status, ini.texto).toBe(200);
    expect(ini.body.atividade.isDegrau).toBeFalsy();
    const itensNormais = await dbB.eduDiagnosticItem.count({ where: { diagnosticId: ma.diagnosticoId, role: "NORMAL", isDegrauLegacy: false } });
    expect(ini.body.totalQuestoes).toBe(itensNormais);
    const sess = await dbB.eduAttemptSession.findUniqueOrThrow({ where: { id: ini.body.sessionId } });
    expect(sess.extraItems).toEqual([]);
  });
});

describe("Outra matéria depois de Matemática", () => {
  it("Português: recebe a trilha de Português e a de Matemática continua ativa", async () => {
    const r = await materias(alunoB);
    const lp = r.body.materias.find((m: { codigo: string }) => m.codigo === "LP");
    expect(lp.estado).toBe("disponivel");
    const { final } = await responderTudo(alunoB, lp.diagnosticoId, (_p, g) => errada(g));
    expect(final.trilha, "trilha de Português").not.toBeNull();

    const ativas = await dbB.eduTrackAssignment.findMany({ where: { studentId: alunoB.studentId, endedAt: null }, include: { track: true } });
    const materiasAtivas = new Set(ativas.map((a) => a.track.subjectCode));
    expect(materiasAtivas.has("MA")).toBe(true);
    expect(materiasAtivas.has("LP")).toBe(true);
  });

  it("Minhas matérias: Matemática e Português em trilha, o resto disponível", async () => {
    const r = await materias(alunoB);
    for (const m of r.body.materias) {
      expect(m.estado, m.codigo).toBe(["MA", "LP"].includes(m.codigo) ? "em_trilha" : "disponivel");
    }
  });

  it("a família vê Matemática e Português com o diagnóstico feito, sem código nem gabarito", async () => {
    const link = await dbB.eduGuardianLink.findFirst({ where: { studentId: alunoB.studentId, isActive: true } });
    expect(link, "responsável ligado ao aluno no seed").not.toBeNull();
    estado.familia = { guardianId: link!.guardianId, networkId: alunoB.networkId, db: dbB };
    const r = await json(await getFamiliaMaterias(new Request("http://localhost"), { params: { studentId: alunoB.studentId } }));
    expect(r.status, r.texto).toBe(200);
    expect(r.texto).not.toMatch(SEGREDO);
    expect(r.texto).not.toMatch(/"[a-z]+(-[a-z0-9]+){2,}"/);
    const porCodigo = Object.fromEntries(r.body.materias.map((m: { codigo: string }) => [m.codigo, m]));
    for (const c of ["MA", "LP"]) {
      expect(porCodigo[c]?.diagnosticoFeitoEm, `${c} com diagnóstico`).toBeTruthy();
      expect(porCodigo[c]?.estado, c).toBe("EM_TRILHA");
    }
    expect(porCodigo["CI"]?.estado).toBe("COMECAR");
  });

  it("a família não vê aluno que não é dela", async () => {
    const link = await dbB.eduGuardianLink.findFirst({ where: { studentId: alunoB.studentId, isActive: true } });
    estado.familia = { guardianId: link!.guardianId, networkId: alunoB.networkId, db: dbB };
    const r = await json(await getFamiliaMaterias(new Request("http://localhost"), { params: { studentId: colegaB.studentId } }));
    expect(r.status).toBe(404);
  });

  it("nenhum EduTeacherAlert criado pelo reforço", async () => {
    const alertas = await dbB.eduTeacherAlert.count({ where: { studentId: alunoB.studentId, createdAt: { gte: inicioDoTeste } } });
    expect(alertas).toBe(0);
  });
});

describe("Cobertura do conteúdo importado (bases db01 e db02)", () => {
  for (const [nome, db] of [["db01", dbA], ["db02", dbB]] as const) {
    for (const ano of [5, 6]) {
      const comps = ano === 6 ? COMPONENTES_6 : COMPONENTES_5;
      for (const comp of comps) {
        it(`${nome} ${comp} ${ano}º: diagnóstico APPROVED com 2 habilidades${ano === 6 ? " e banco do degrau" : ""}`, async () => {
          const diags = await db.eduDiagnostic.findMany({
            where: { networkId: null, source: "SPEAKFLOW", status: "APPROVED", subjectCode: comp, gradeYear: ano },
            include: { items: { where: { isDegrauLegacy: false } } },
          });
          const ok = diags.some((d) => {
            const normais = new Set(d.items.filter((i) => i.role === "NORMAL").map((i) => i.skillId));
            const banco = d.items.filter((i) => i.role === "DEGRAU_BANK").length;
            return normais.size >= 2 && (ano === 5 || banco > 0);
          });
          expect(ok, `${comp} ${ano}º: ${diags.map((d) => d.id).join(", ") || "nenhum diagnóstico"}`).toBe(true);
        });
      }
    }
  }
});

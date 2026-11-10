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
import { POST as postEnviar } from "@/app/api/escola/aluno/atividades/[id]/enviar/route";
import { GET as getFamiliaResumo } from "@/app/api/escola/familia/filhos/[studentId]/resumo/route";
import { GET as getFamiliaRetornos } from "@/app/api/escola/familia/filhos/[studentId]/retornos/route";
import { GET as getFamiliaEvolucao } from "@/app/api/escola/familia/filhos/[studentId]/evolucao/route";
import { POST as postEntrar } from "@/app/api/escola/aluno/entrar/route";
import { signDeviceToken } from "@/lib/escola/device";
import bcrypt from "bcryptjs";
import { GET as getRecadosFamilia, POST as postRecadoFamilia } from "@/app/api/escola/familia/filhos/[studentId]/recados/route";
import { GET as getAgendaFamilia, POST as postAgendaFamilia, DELETE as deleteAgendaFamilia } from "@/app/api/escola/familia/filhos/[studentId]/agenda/route";
import { GET as getRecadosAluno, POST as postRecadoLido } from "@/app/api/escola/aluno/recados/route";
import { GET as getAgendaAluno } from "@/app/api/escola/aluno/agenda/route";
import { POST as postAvisos } from "@/app/api/escola/aluno/avisos/route";

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
  await c.db.eduTrackProgress.deleteMany({ where: { studentId: c.studentId } });
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

/** Responsável ativo do aluno do 6º B; cria um só para o teste se o seed não tiver */
async function responsavelDoAlunoB(): Promise<string> {
  const link = await dbB.eduGuardianLink.findFirst({ where: { studentId: alunoB.studentId, isActive: true } });
  if (link) return link.guardianId;
  const g = await dbB.eduGuardian.upsert({
    where: { id: "teste-responsavel-6b" },
    create: { id: "teste-responsavel-6b", networkId: alunoB.networkId, name: "Responsável Teste 6B" },
    update: {},
  });
  await dbB.eduGuardianLink.upsert({
    where: { guardianId_studentId: { guardianId: g.id, studentId: alunoB.studentId } },
    create: { networkId: alunoB.networkId, guardianId: g.id, studentId: alunoB.studentId, relation: "MAE", isActive: true },
    update: { isActive: true },
  });
  return g.id;
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
    // "Começar minha trilha" abre a primeira atividade: ela tem que estar na lista do aluno
    estado.ctx = alunoB;
    const lista = await json(await getAtividades(new NextRequest("http://localhost/api/escola/aluno/atividades?filter=todo")));
    expect(lista.status, lista.texto).toBe(200);
    const primeira = (final.trilha as unknown as { primeiraAtividadeId: string }).primeiraAtividadeId;
    expect(lista.body.atividades.map((x: { id: string }) => x.id), "primeira atividade da trilha na lista").toContain(primeira);
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
    const guardianId = await responsavelDoAlunoB();
    estado.familia = { guardianId, networkId: alunoB.networkId, db: dbB };
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

  it("painel da família abre com trilha da biblioteca (sem subjectId): resumo, retornos e evolução", async () => {
    const guardianId = await responsavelDoAlunoB();
    estado.familia = { guardianId, networkId: alunoB.networkId, db: dbB };
    const params = { params: { studentId: alunoB.studentId } };
    const resumo = await json(await getFamiliaResumo(new Request("http://localhost"), params));
    expect(resumo.status, resumo.texto).toBe(200);
    expect(resumo.body.trilhaAtual, "trilha atual").not.toBeNull();
    expect(["Matemática", "Língua Portuguesa"]).toContain(resumo.body.trilhaAtual.subjectName);
    expect(resumo.texto).not.toMatch(/EF\d{2}[A-Z]{2}\d{2}/);
    const retornos = await json(await getFamiliaRetornos(new Request("http://localhost"), params));
    expect(retornos.status, retornos.texto).toBe(200);
    const evolucao = await json(await getFamiliaEvolucao(new Request("http://localhost"), params));
    expect(evolucao.status, evolucao.texto).toBe(200);
  });

  it("a família não vê aluno que não é dela", async () => {
    const guardianId = await responsavelDoAlunoB();
    estado.familia = { guardianId, networkId: alunoB.networkId, db: dbB };
    const r = await json(await getFamiliaMaterias(new Request("http://localhost"), { params: { studentId: colegaB.studentId } }));
    expect(r.status).toBe(404);
  });

  it("nenhum EduTeacherAlert criado pelo reforço", async () => {
    const alertas = await dbB.eduTeacherAlert.count({ where: { studentId: alunoB.studentId, createdAt: { gte: inicioDoTeste } } });
    expect(alertas).toBe(0);
  });
});

describe("Toda matéria, nas duas turmas: diagnóstico, trilha e a primeira atividade abre e é corrigida", () => {
  // 6º B não tem componentes cadastrados pela escola; 5º A tem. O reforço tem que funcionar nos dois casos.
  for (const nome of ["6º B", "5º A"] as const) {
    it(`${nome}: todas as matérias do ano`, async () => {
      const c = nome === "6º B" ? alunoB : alunoA;
      await limparReforco(c);
      await c.db.eduSubmission.deleteMany({ where: { studentId: c.studentId } });
      const r = await materias(c);
      expect(r.status, r.texto).toBe(200);
      for (const m of r.body.materias as Array<{ codigo: string; diagnosticoId: string }>) {
        const { final } = await responderTudo(c, m.diagnosticoId, (_p, g) => errada(g));
        const trilha = final.trilha as { primeiraAtividadeId: string } | null;
        expect(trilha, `${nome} ${m.codigo}: trilha atribuída`).not.toBeNull();

        estado.ctx = c;
        const lista = await json(await getAtividades(new NextRequest("http://localhost/api/escola/aluno/atividades?filter=todo")));
        expect(lista.status, `${nome} ${m.codigo}: ${lista.texto}`).toBe(200);
        expect(lista.body.atividades.map((x: { id: string }) => x.id), `${nome} ${m.codigo}: primeira atividade na lista`).toContain(trilha!.primeiraAtividadeId);

        const qs = await c.db.eduQuizQuestion.findMany({ where: { activityId: trilha!.primeiraAtividadeId }, orderBy: { order: "asc" } });
        const req = new NextRequest(`http://localhost/api/escola/aluno/atividades/${trilha!.primeiraAtividadeId}/enviar`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ quizAnswers: qs.map((q) => ({ questionId: q.id, selectedIndex: q.correctIndex })) }),
        });
        const env = await json(await postEnviar(req, { params: { id: trilha!.primeiraAtividadeId } }));
        expect(env.status, `${nome} ${m.codigo}: entrega ${env.texto}`).toBe(200);
        const sub = await c.db.eduSubmission.findFirst({ where: { studentId: c.studentId, activityId: trilha!.primeiraAtividadeId }, orderBy: { attempt: "desc" } });
        expect(sub?.status, `${nome} ${m.codigo}: corrigida`).toBe("EVALUATED");
        // Acertou tudo: a etapa conta e a trilha anda
        const prog = await c.db.eduTrackProgress.findMany({ where: { studentId: c.studentId } });
        const feitos = prog.flatMap((p) => p.completedItemIds);
        const itens = await c.db.eduTrackItem.findMany({ where: { activityId: trilha!.primeiraAtividadeId }, select: { id: true } });
        expect(itens.some((i) => feitos.includes(i.id)), `${nome} ${m.codigo}: etapa marcada na trilha`).toBe(true);
      }
    });
  }
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

describe("Trilhas da biblioteca: só as etapas do pacote, todas publicadas", () => {
  for (const [nome, db] of [["db01", dbA], ["db02", dbB]] as const) {
    it(`${nome}: cada trilha SF-TRACK tem itens SF-ITEM, em ordem, e toda atividade abre`, async () => {
      const tracks = await db.eduTrack.findMany({
        where: { networkId: null, status: "APPROVED", id: { startsWith: "SF-TRACK-" } },
        include: { items: { orderBy: { order: "asc" } } },
      });
      expect(tracks.length).toBeGreaterThan(0);
      const problemas: string[] = [];
      for (const t of tracks) {
        if (t.items.length === 0) problemas.push(`${t.id}: sem etapas`);
        const codigo = t.id.slice("SF-TRACK-".length);
        t.items.forEach((it, i) => {
          if (it.id !== `SF-ITEM-${codigo}-${i}` || it.order !== i) problemas.push(`${t.id}: item ${it.id} (ordem ${it.order})`);
        });
        const acts = await db.eduActivity.findMany({
          where: { id: { in: t.items.map((i) => i.activityId) } },
          select: { id: true, status: true },
        });
        for (const it of t.items) {
          const a = acts.find((x) => x.id === it.activityId);
          if (!a) problemas.push(`${t.id}: atividade ${it.activityId} não existe`);
          else if (a.status !== "PUBLISHED") problemas.push(`${t.id}: atividade ${a.id} está ${a.status}`);
        }
      }
      expect(problemas, problemas.slice(0, 10).join("\n")).toEqual([]);
    });
  }
});

describe("Entrar pelo aparelho de casa com PIN", () => {
  async function entrar(studentId: string, nid: string, pin: string, nome: string) {
    const cookie = await signDeviceToken([{ id: studentId, name: nome, initial: "", loginMode: "PIN", nid }]);
    const req = new NextRequest("http://localhost/api/escola/aluno/entrar", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `sf_edu_device=${cookie}` },
      body: JSON.stringify({ mode: "dispositivo", studentId, nid, pin }),
    });
    return json(await postEntrar(req));
  }

  it("PIN certo entra; PIN errado não entra", async () => {
    await dbB.eduStudent.update({
      where: { id: colegaB.studentId },
      data: { pinHash: bcrypt.hashSync("2468", 10), pinFailedCount: 0, pinLockedUntil: null, loginMode: "PIN" },
    });
    const errado = await entrar(colegaB.studentId, colegaB.networkId, "1111", "Colega");
    expect(errado.status).toBe(401);
    const certo = await entrar(colegaB.studentId, colegaB.networkId, "2468", "Colega");
    expect(certo.status, certo.texto).toBe(200);
    expect(certo.body.ok).toBe(true);
  });
});

describe("Trilha: errar, tentar de novo e, esgotadas as tentativas, receber a base", () => {
  it("6º B Matemática", async () => {
    const c = alunoB;
    await limparReforco(c);
    await c.db.eduSubmission.deleteMany({ where: { studentId: c.studentId } });
    const r = await materias(c);
    const ma = (r.body.materias as Array<{ codigo: string; diagnosticoId: string }>).find((m) => m.codigo === "MA")!;
    const { final } = await responderTudo(c, ma.diagnosticoId, (_p, g) => errada(g));
    const atvId = (final.trilha as { primeiraAtividadeId: string }).primeiraAtividadeId;
    const atv = await c.db.eduActivity.findUniqueOrThrow({ where: { id: atvId } });
    const qs = await c.db.eduQuizQuestion.findMany({ where: { activityId: atvId }, orderBy: { order: "asc" } });
    const itens = (await c.db.eduTrackItem.findMany({ where: { activityId: atvId }, select: { id: true } })).map((i) => i.id);
    const etapaFeita = async () => (await c.db.eduTrackProgress.findMany({ where: { studentId: c.studentId } })).some((p) => p.completedItemIds.some((id) => itens.includes(id)));
    const enviarErrado = async () => {
      estado.ctx = c;
      const req = new NextRequest(`http://localhost/api/escola/aluno/atividades/${atvId}/enviar`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ quizAnswers: qs.map((q) => ({ questionId: q.id, selectedIndex: (q.correctIndex + 1) % (q.options as unknown[]).length })) }),
      });
      return json(await postEnviar(req, { params: { id: atvId } }));
    };

    for (let t = 1; t <= atv.maxAttempts; t++) {
      const env = await enviarErrado();
      expect(env.status, env.texto).toBe(200);
      if (t < atv.maxAttempts) {
        expect(await etapaFeita(), `tentativa ${t}: ainda não conta`).toBe(false);
        estado.ctx = c;
        const feitas = await json(await getAtividades(new NextRequest("http://localhost/api/escola/aluno/atividades?filter=feito")));
        const a = feitas.body.atividades.find((x: { id: string }) => x.id === atvId);
        expect(a?.canRetry, "pode tentar de novo").toBe(true);
      } else {
        expect(await etapaFeita(), "tentativas esgotadas: a trilha segue").toBe(true);
        // Se a habilidade da trilha tem pré-requisito com trilha na biblioteca, o aluno recebe essa base
        const track = await c.db.eduTrack.findFirstOrThrow({ where: { items: { some: { activityId: atvId } } } });
        const pre = await c.db.eduSkillPrerequisite.findMany({ where: { skillId: { in: track.skillIds }, status: "APPROVED" } });
        const comTrilha = await c.db.eduTrack.findMany({ where: { status: "APPROVED", networkId: null, skillIds: { hasSome: pre.map((x) => x.prerequisiteSkillId) } } });
        if (comTrilha.length) {
          expect(env.body.trilha?.base, `base atribuída (${comTrilha.map((x) => x.id).join(", ")})`).toBeTruthy();
        }
      }
    }
    const alertas = await c.db.eduTeacherAlert.count({ where: { studentId: c.studentId, createdAt: { gte: inicioDoTeste } } });
    expect(alertas, "nenhum aviso ao professor").toBe(0);
  });
});

describe("Recado e agenda da família, vistos pelo aluno", () => {
  const corpo = (b: unknown, method = "POST") => new Request("http://localhost", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(b) });

  it("a família manda um elogio, o aluno vê com o nome de quem mandou e marca como lido", async () => {
    const guardianId = await responsavelDoAlunoB();
    estado.familia = { guardianId, networkId: alunoB.networkId, db: dbB };
    await dbB.eduFamilyMessage.deleteMany({ where: { studentId: alunoB.studentId } });
    const params = { params: { studentId: alunoB.studentId } };

    const invalido = await json(await postRecadoFamilia(corpo({ kind: "XYZ", text: "oi" }), params));
    expect(invalido.status).toBe(400);
    const env = await json(await postRecadoFamilia(corpo({ kind: "ELOGIO", text: "Parabéns pelo esforço!" }), params));
    expect(env.status, env.texto).toBe(201);

    estado.ctx = alunoB;
    const vistos = await json(await getRecadosAluno());
    expect(vistos.status, vistos.texto).toBe(200);
    const r = vistos.body.recados[0];
    expect(r.text).toBe("Parabéns pelo esforço!");
    expect(r.lido).toBe(false);
    expect(vistos.texto).not.toMatch(/guardianId|email/);

    const lido = await json(await postRecadoLido(corpo({ id: r.id })));
    expect(lido.status).toBe(200);
    const lista = await json(await getRecadosFamilia(new Request("http://localhost"), params));
    expect(lista.body.recados[0].lido, "família vê que foi lido").toBe(true);
  });

  it("outro aluno não vê o recado, e a família não manda recado para quem não é filho dela", async () => {
    estado.ctx = colegaB;
    const vistos = await json(await getRecadosAluno());
    expect(vistos.body.recados.some((r: { text: string }) => r.text === "Parabéns pelo esforço!")).toBe(false);
    const guardianId = await responsavelDoAlunoB();
    estado.familia = { guardianId, networkId: alunoB.networkId, db: dbB };
    const outro = await json(await postRecadoFamilia(corpo({ kind: "LEMBRETE", text: "Hora de estudar" }), { params: { studentId: colegaB.studentId } }));
    expect(outro.status).toBe(404);
  });

  it("agenda: a família cria horários, o aluno vê os de hoje; remover tira da lista", async () => {
    const guardianId = await responsavelDoAlunoB();
    estado.familia = { guardianId, networkId: alunoB.networkId, db: dbB };
    await dbB.eduStudyPlanItem.deleteMany({ where: { studentId: alunoB.studentId } });
    const params = { params: { studentId: alunoB.studentId } };
    const ruim = await json(await postAgendaFamilia(corpo({ weekdays: [], time: "25:00" }), params));
    expect(ruim.status).toBe(400);
    const criado = await json(await postAgendaFamilia(corpo({ weekdays: [0, 1, 2, 3, 4, 5, 6], time: "18:30", subjectCode: "MA", minutes: 20 }), params));
    expect(criado.status, criado.texto).toBe(201);
    expect(criado.body.itens).toHaveLength(7);

    estado.ctx = alunoB;
    const doAluno = await json(await getAgendaAluno());
    expect(doAluno.status, doAluno.texto).toBe(200);
    expect(doAluno.body.hoje).toHaveLength(1);
    expect(doAluno.body.hoje[0]).toMatchObject({ time: "18:30", subjectCode: "MA", minutes: 20 });

    const id = criado.body.itens[0].id;
    const removido = await json(await deleteAgendaFamilia(new Request(`http://localhost/?id=${id}`, { method: "DELETE" }), params));
    expect(removido.body.itens).toHaveLength(6);
    const lista = await json(await getAgendaFamilia(new Request("http://localhost"), params));
    expect(lista.body.itens).toHaveLength(6);
  });
});

describe("Agenda sem repetição e avisos do aluno", () => {
  const corpo = (b: unknown) => new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });

  it("o mesmo dia e hora não entram duas vezes; só os dias novos entram", async () => {
    const guardianId = await responsavelDoAlunoB();
    estado.familia = { guardianId, networkId: alunoB.networkId, db: dbB };
    await dbB.eduStudyPlanItem.deleteMany({ where: { studentId: alunoB.studentId } });
    const params = { params: { studentId: alunoB.studentId } };
    const a = await json(await postAgendaFamilia(corpo({ weekdays: [0, 2], time: "10:25", minutes: 20 }), params));
    expect(a.status, a.texto).toBe(201);
    const repetido = await json(await postAgendaFamilia(corpo({ weekdays: [0, 2], time: "10:25", minutes: 20 }), params));
    expect(repetido.status).toBe(409);
    const parte = await json(await postAgendaFamilia(corpo({ weekdays: [0, 2, 4], time: "10:25", minutes: 20 }), params));
    expect(parte.status).toBe(201);
    expect(parte.body.itens).toHaveLength(3);
    const ids = parte.body.itens.map((i: { id: string }) => i.id).join(",");
    const fora = await json(await deleteAgendaFamilia(new Request(`http://localhost/?ids=${ids}`, { method: "DELETE" }), params));
    expect(fora.body.itens).toHaveLength(0);
  });

  it("o aluno inscreve o aparelho para avisos; inscrição inválida é recusada", async () => {
    estado.ctx = alunoB;
    const ruim = await json(await postAvisos(corpo({ endpoint: "http://x" })));
    expect(ruim.status).toBe(400);
    const endpoint = `https://push.exemplo.test/${alunoB.studentId}`;
    const ok = await json(await postAvisos(corpo({ endpoint, keys: { p256dh: "chave", auth: "segredo" } })));
    expect(ok.status, ok.texto).toBe(201);
    // O mesmo aparelho passa para outro aluno (aparelho de casa): fica uma inscrição só
    estado.ctx = colegaB;
    await postAvisos(corpo({ endpoint, keys: { p256dh: "chave", auth: "segredo" } }));
    const subs = await dbB.eduPushSubscription.findMany({ where: { endpoint } });
    expect(subs).toHaveLength(1);
    expect(subs[0].studentId).toBe(colegaB.studentId);
    await dbB.eduPushSubscription.deleteMany({ where: { endpoint } });
  });
});

describe("Trilha na ordem: só a próxima etapa aparece para fazer", () => {
  it("depois do diagnóstico, só a etapa 1 de cada trilha está na lista; acertando, aparece a 2", async () => {
    const c = alunoB;
    await limparReforco(c);
    await c.db.eduSubmission.deleteMany({ where: { studentId: c.studentId } });
    const r = await materias(c);
    const ma = (r.body.materias as Array<{ codigo: string; diagnosticoId: string }>).find((m) => m.codigo === "MA")!;
    const { final } = await responderTudo(c, ma.diagnosticoId, (_p, g) => errada(g));
    const primeira = (final.trilha as { primeiraAtividadeId: string }).primeiraAtividadeId;
    const track = await c.db.eduTrack.findFirstOrThrow({ where: { items: { some: { activityId: primeira } } }, include: { items: { orderBy: { order: "asc" } } } });
    const lista = async () => {
      estado.ctx = c;
      const l = await json(await getAtividades(new NextRequest("http://localhost/api/escola/aluno/atividades?filter=todo")));
      return (l.body.atividades as Array<{ id: string }>).map((a) => a.id);
    };
    let ids = await lista();
    expect(ids).toContain(track.items[0].activityId);
    for (const it of track.items.slice(1)) expect(ids, `etapa ${it.order + 1} não aparece antes da hora`).not.toContain(it.activityId);

    const qs = await c.db.eduQuizQuestion.findMany({ where: { activityId: primeira }, orderBy: { order: "asc" } });
    estado.ctx = c;
    await postEnviar(new NextRequest(`http://localhost/api/escola/aluno/atividades/${primeira}/enviar`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ quizAnswers: qs.map((q) => ({ questionId: q.id, selectedIndex: q.correctIndex })) }),
    }), { params: { id: primeira } });
    ids = await lista();
    expect(ids).toContain(track.items[1].activityId);
    expect(ids).not.toContain(track.items[2].activityId);
  });
});

describe("Irmãos na mesma escola: 5º e 6º ano da Escola Particular Demo B", () => {
  it("a aluna do 5º Ano B vê as 8 matérias do 5º ano e a família B pode acompanhá-la", async () => {
    const irma = await ctxDoSeed(dbB, "aluna5-demo-rede-b");
    expect(irma.networkId).toBe(alunoB.networkId);
    const r = await materias(irma);
    expect(r.status, r.texto).toBe(200);
    expect(r.body.materias.map((m: { codigo: string }) => m.codigo).sort()).toEqual([...COMPONENTES_5].sort());
    // Mesma escola do irmão: a família pode ser ligada aos dois
    const [escolaIrma, escolaIrmao] = await Promise.all([irma, alunoB].map(async (c) =>
      (await dbB.eduClass.findUniqueOrThrow({ where: { id: c.classId } })).schoolId));
    expect(escolaIrma).toBe(escolaIrmao);
  });
});

// Seed EXCLUSIVO da rede de demonstracao da area da familia.
// Uso: node prisma/seed-familia-demo.mjs --confirm [--reset]
// SEGURANCA: so opera na rede cujo nome e exatamente DEMO_NAME. Nunca em redes reais.
import { readFileSync } from "node:fs";
import { createHash, randomInt } from "node:crypto";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }

const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const RESET = args.includes("--reset");
const DEMO_NAME = "Vila Esperança (Demonstração)";

if (!CONFIRM) {
  console.log("Seed da familia (DEMO). Rode com --confirm para executar:\n  node prisma/seed-familia-demo.mjs --confirm [--reset]");
  process.exit(0);
}

const bcrypt = (await import("bcryptjs")).default;
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();

const sha = (s) => createHash("sha256").update(s.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code8 = () => Array.from({ length: 8 }, () => ALPHA[randomInt(ALPHA.length)]).join("");

// Segunda 00:00 America/Sao_Paulo como Date UTC + helpers de dia.
function weekStartSP(now = new Date()) {
  const sp = new Date(now.getTime() - 3 * 3600000);
  const diff = (sp.getUTCDay() + 6) % 7;
  const mon = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate() - diff));
  return new Date(mon.getTime() + 3 * 3600000);
}
const WS = weekStartSP();
const dayAt = (i, hour = 14) => new Date(WS.getTime() + i * 86400000 + hour * 3600000); // i=0 seg

async function main() {
  // 1) Rede demo (achar por nome; criar se faltar). Trava de seguranca.
  let net = await db.eduNetwork.findFirst({ where: { name: DEMO_NAME } });
  if (!net) net = await db.eduNetwork.create({ data: { name: DEMO_NAME, city: "Vila Esperança", state: "SP", gradeConfig: {} } });
  if (net.name !== DEMO_NAME) { throw new Error("ABORT: rede resolvida nao e a de demonstracao."); }
  const networkId = net.id;
  console.log("Rede demo:", networkId, net.name);

  const anaExists = await db.eduStudent.findUnique({ where: { networkId_enrollmentCode: { networkId, enrollmentCode: "DEMO-ANA" } } }).catch(() => null);
  if (anaExists && !RESET) { console.log("Ja populado (use --reset para refazer)."); return; }

  if (RESET) {
    console.log("Reset: limpando dados da rede demo…");
    const studs = await db.eduStudent.findMany({ where: { networkId }, select: { id: true } });
    const sids = studs.map((s) => s.id);
    await db.eduSubmission.deleteMany({ where: { networkId } });
    await db.eduSkillMasteryEvent.deleteMany({ where: { networkId } });
    await db.eduSkillMastery.deleteMany({ where: { networkId } });
    await db.eduTrackProgress.deleteMany({ where: { networkId } });
    await db.eduTrackAssignment.deleteMany({ where: { networkId } });
    await db.eduTrackItem.deleteMany({ where: { track: { networkId } } }).catch(() => {});
    await db.eduTrack.deleteMany({ where: { networkId } });
    await db.eduDiagnosticItem.deleteMany({ where: { diagnostic: { networkId } } }).catch(() => {});
    await db.eduDiagnostic.deleteMany({ where: { networkId } });
    await db.eduFamilyCode.deleteMany({ where: { networkId } });
    await db.eduFamilyTip.deleteMany({ where: { networkId } }).catch(() => {});
    await db.eduGuardianConsent.deleteMany({ where: { studentId: { in: sids } } }).catch(() => {});
    await db.eduGuardianLink.deleteMany({ where: { networkId } });
    await db.eduGuardianInvite.deleteMany({ where: { networkId } }).catch(() => {});
    await db.eduGuardian.deleteMany({ where: { networkId } });
    await db.eduActivity.deleteMany({ where: { networkId } });
    await db.eduClassSubject.deleteMany({ where: { networkId } });
    await db.eduEnrollment.deleteMany({ where: { networkId } });
    await db.eduClass.deleteMany({ where: { networkId } });
    await db.eduStudent.deleteMany({ where: { networkId } });
    await db.eduSkill.deleteMany({ where: { networkId } });
    await db.eduSchoolYear.deleteMany({ where: { networkId } });
    await db.eduSchool.deleteMany({ where: { networkId } });
  }

  // 2) Escolas (com contato ficticio), ano letivo, componentes
  const esc1 = await db.eduSchool.create({ data: { networkId, name: "EM Professor Demo Silva", inepCode: "99000001", phone: "(11) 4000-0001", email: "secretaria.silva@vilaesperanca.edu.demo" } });
  const esc2 = await db.eduSchool.create({ data: { networkId, name: "EM Professora Demo Santos", inepCode: "99000002", phone: "(11) 4000-0002", email: "secretaria.santos@vilaesperanca.edu.demo" } });
  const year = await db.eduSchoolYear.create({ data: { networkId, year: 2027, startsAt: new Date("2027-02-01"), endsAt: new Date("2027-12-15"), isCurrent: true } });
  const subMat = await db.eduSubject.create({ data: { networkId, name: "Matemática", color: "#1D4ED8" } });
  const subPor = await db.eduSubject.create({ data: { networkId, name: "Língua Portuguesa", color: "#BE185D" } });

  // 3) Turmas
  const t6 = await db.eduClass.create({ data: { networkId, schoolId: esc1.id, schoolYearId: year.id, name: "6º B", stage: "ELEMENTARY_LATE", gradeYear: 6, shift: "MORNING", accessCode: "VE2027-6B" } });
  const t3 = await db.eduClass.create({ data: { networkId, schoolId: esc2.id, schoolYearId: year.id, name: "3º A", stage: "ELEMENTARY_EARLY", gradeYear: 3, shift: "MORNING", accessCode: "VE2027-3A" } });
  const cs6mat = await db.eduClassSubject.create({ data: { networkId, classId: t6.id, subjectId: subMat.id } });
  const cs3por = await db.eduClassSubject.create({ data: { networkId, classId: t3.id, subjectId: subPor.id } });

  // 4) Habilidades de exemplo (<=10, scoped na rede demo, code DEMO-*)
  const mkSkill = (code, subjectCode, stage, gy, description, shortLabel) =>
    db.eduSkill.create({ data: { code, subjectCode, stage, gradeYears: [gy], description, shortLabel, networkId } });
  const maSkills = await Promise.all([
    mkSkill("DEMO-EF06MA01", "MA", "ELEMENTARY_LATE", 6, "Reconhecer fração como parte de um todo.", "Frações: parte de um todo"),
    mkSkill("DEMO-EF06MA02", "MA", "ELEMENTARY_LATE", 6, "Identificar frações equivalentes.", "Frações equivalentes"),
    mkSkill("DEMO-EF06MA03", "MA", "ELEMENTARY_LATE", 6, "Comparar e ordenar frações.", "Comparar frações"),
    mkSkill("DEMO-EF06MA04", "MA", "ELEMENTARY_LATE", 6, "Localizar frações na reta numérica.", "Frações na reta"),
    mkSkill("DEMO-EF06MA05", "MA", "ELEMENTARY_LATE", 6, "Somar e subtrair frações simples.", "Somar frações"),
    mkSkill("DEMO-EF06MA06", "MA", "ELEMENTARY_LATE", 6, "Relacionar fração, decimal e porcentagem.", "Fração e decimal"),
    mkSkill("DEMO-EF06MA07", "MA", "ELEMENTARY_LATE", 6, "Resolver problemas com frações.", "Problemas com frações"),
    mkSkill("DEMO-EF06MA08", "MA", "ELEMENTARY_LATE", 6, "Representar frações em figuras.", "Frações em figuras"),
  ]);
  const porSkills = await Promise.all([
    mkSkill("DEMO-EF03LP01", "LP", "ELEMENTARY_EARLY", 3, "Ler palavras com sílabas complexas.", "Sílabas complexas"),
    mkSkill("DEMO-EF03LP02", "LP", "ELEMENTARY_EARLY", 3, "Ler com fluência textos curtos.", "Leitura fluente"),
  ]);

  // 5) Alunos + matriculas
  const pinHash = await bcrypt.hash("123456", 10);
  const ana = await db.eduStudent.create({ data: { networkId, enrollmentCode: "DEMO-ANA", fullName: "Ana Souza", birthDate: new Date("2015-04-10"), pinHash } });
  const pedro = await db.eduStudent.create({ data: { networkId, enrollmentCode: "DEMO-PEDRO", fullName: "Pedro Souza", birthDate: new Date("2018-08-22"), pinHash } });
  await db.eduEnrollment.create({ data: { networkId, studentId: ana.id, classId: t6.id, schoolYearId: year.id, status: "ACTIVE" } });
  await db.eduEnrollment.create({ data: { networkId, studentId: pedro.id, classId: t3.id, schoolYearId: year.id, status: "ACTIVE" } });

  // 6) Responsavel Maria ligada aos dois + codigos de familia
  const maria = await db.eduGuardian.create({ data: { networkId, name: "Maria Souza", email: "maria.souza@exemplo.demo", phone: "(11) 90000-0000" } });
  await db.eduGuardianLink.create({ data: { networkId, guardianId: maria.id, studentId: ana.id, relation: "MAE", isActive: true } });
  await db.eduGuardianLink.create({ data: { networkId, guardianId: maria.id, studentId: pedro.id, relation: "MAE", isActive: true } });
  const anaCode = code8(), pedroCode = code8();
  await db.eduFamilyCode.create({ data: { networkId, studentId: ana.id, codeHash: sha(anaCode), activationsLeft: 3, expiresAt: new Date(Date.now() + 120 * 86400000) } });
  await db.eduFamilyCode.create({ data: { networkId, studentId: pedro.id, codeHash: sha(pedroCode), activationsLeft: 3, expiresAt: new Date(Date.now() + 120 * 86400000) } });

  // 7) Atividades (para trilha, entregas e diagnostico)
  const rubric = { criterios: [{ nome: "Compreensão", peso: 1 }] };
  const mkAct = (cs, type, title) => db.eduActivity.create({ data: { networkId, classSubjectId: cs, type, title, prompt: title, rubric, status: "PUBLISHED", createdById: "seed" } });
  const anaActs = await Promise.all(Array.from({ length: 5 }, (_, i) => mkAct(cs6mat.id, i === 0 ? "SPOKEN" : i === 1 ? "WRITTEN" : "QUIZ", `Atividade de frações ${i + 1}`)));
  const pedroActs = await Promise.all(Array.from({ length: 4 }, (_, i) => mkAct(cs3por.id, "WRITTEN", `Leitura ${i + 1}`)));

  // 8) Trilhas APPROVED + itens + atribuicao + progresso
  const trilhaAna = await db.eduTrack.create({ data: { networkId, subjectId: subMat.id, gradeYear: 6, title: "Frações: parte de um todo", skillIds: [maSkills[0].id], status: "APPROVED", createdById: "seed", approvedById: "seed" } });
  const anaItems = await Promise.all(anaActs.map((a, i) => db.eduTrackItem.create({ data: { trackId: trilhaAna.id, order: i + 1, activityId: a.id, estMinutes: 10 } })));
  const asgAna = await db.eduTrackAssignment.create({ data: { networkId, trackId: trilhaAna.id, studentId: ana.id, assignedBy: "seed", startsAt: dayAt(0) } });
  await db.eduTrackProgress.create({ data: { networkId, assignmentId: asgAna.id, studentId: ana.id, completedItemIds: anaItems.slice(0, 3).map((i) => i.id), lastActivityAt: dayAt(3) } });

  const trilhaPedro = await db.eduTrack.create({ data: { networkId, subjectId: subPor.id, gradeYear: 3, title: "Leitura de palavras com sílabas complexas", skillIds: [porSkills[0].id], status: "APPROVED", createdById: "seed", approvedById: "seed" } });
  const pedroItems = await Promise.all(pedroActs.map((a, i) => db.eduTrackItem.create({ data: { trackId: trilhaPedro.id, order: i + 1, activityId: a.id, estMinutes: 10 } })));
  const asgPedro = await db.eduTrackAssignment.create({ data: { networkId, trackId: trilhaPedro.id, studentId: pedro.id, assignedBy: "seed", startsAt: dayAt(0) } });
  await db.eduTrackProgress.create({ data: { networkId, assignmentId: asgPedro.id, studentId: pedro.id, completedItemIds: pedroItems.slice(0, 1).map((i) => i.id), lastActivityAt: dayAt(1) } });

  // 9) Dominio: Ana Domina5/Quase2/Ainda1 ; eventos DIAGNOSTIC + 2 PRACTICE (avancaram)
  const anaLevels = ["MASTERED", "MASTERED", "MASTERED", "MASTERED", "MASTERED", "ALMOST", "ALMOST", "NOT_YET"];
  for (let i = 0; i < maSkills.length; i++) {
    const sk = maSkills[i], lvl = anaLevels[i];
    await db.eduSkillMastery.create({ data: { networkId, studentId: ana.id, skillId: sk.id, level: lvl, source: "PRACTICE" } });
    // diagnostico inicial (nivel mais baixo)
    await db.eduSkillMasteryEvent.create({ data: { networkId, studentId: ana.id, skillId: sk.id, level: i < 2 ? "ALMOST" : "NOT_YET", source: "DIAGNOSTIC", createdAt: new Date(Date.now() - 20 * 86400000) } });
    // 2 habilidades avancaram este mes (evento PRACTICE melhor, recente)
    if (i < 2) await db.eduSkillMasteryEvent.create({ data: { networkId, studentId: ana.id, skillId: sk.id, level: "MASTERED", source: "PRACTICE", createdAt: dayAt(3) } });
  }
  // Pedro: niveis variados nas 2 habilidades de LP + diagnostico inicial
  const pedroLevels = ["ALMOST", "NOT_YET"];
  for (let i = 0; i < porSkills.length; i++) {
    await db.eduSkillMastery.create({ data: { networkId, studentId: pedro.id, skillId: porSkills[i].id, level: pedroLevels[i], source: "DIAGNOSTIC" } });
    await db.eduSkillMasteryEvent.create({ data: { networkId, studentId: pedro.id, skillId: porSkills[i].id, level: "NOT_YET", source: "DIAGNOSTIC", createdAt: new Date(Date.now() - 15 * 86400000) } });
  }

  // 10) Entregas da semana: Ana 4 dias (3 com retorno avaliado), Pedro 2 dias
  const fb = (acerto, melhora) => ({ porCriterio: [{ criterio: "Compreensão", nota: 8 }], acertos: [acerto], melhorar: [melhora], exemplo: "Exemplo: 3/4 são 3 de 4 partes iguais." });
  const anaDays = [0, 1, 3, 4];
  for (let k = 0; k < anaDays.length; k++) {
    const d = anaDays[k], act = anaActs[k % anaActs.length];
    const evaluated = k < 3;
    await db.eduSubmission.create({ data: {
      networkId, activityId: act.id, studentId: ana.id, attempt: 1,
      status: evaluated ? "EVALUATED" : "SUBMITTED", aiStatus: evaluated ? "DONE" : "PENDING",
      aiFeedback: evaluated ? fb("Você identificou as partes iguais.", "Explique melhor o denominador.") : undefined,
      masteryLevel: evaluated ? (k === 0 ? "ALMOST" : k === 1 ? "MASTERED" : "ALMOST") : undefined,
      skillId: maSkills[0].id, submittedAt: dayAt(d), evaluatedAt: evaluated ? dayAt(d, 15) : undefined,
    } });
  }
  const pedroDays = [0, 2];
  for (let k = 0; k < pedroDays.length; k++) {
    await db.eduSubmission.create({ data: {
      networkId, activityId: pedroActs[k].id, studentId: pedro.id, attempt: 1,
      status: "EVALUATED", aiStatus: "DONE",
      aiFeedback: fb("Leu as sílabas simples corretamente.", "Treine as sílabas com encontro consonantal."),
      masteryLevel: "ALMOST", skillId: porSkills[0].id, submittedAt: dayAt(pedroDays[k]), evaluatedAt: dayAt(pedroDays[k], 15),
    } });
  }

  // 11) Diagnostico OPEN para o 3o ano (Pedro) SEM entrega -> alerta "novo diagnostico"
  const diag = await db.eduDiagnostic.create({ data: { networkId, subjectId: subPor.id, gradeYear: 3, title: "Diagnóstico de Leitura — 3º ano", cycle: 2, status: "OPEN", opensAt: new Date(Date.now() - 2 * 86400000), closesAt: new Date(Date.now() + 10 * 86400000), createdById: "seed" } });
  const diagAct = await mkAct(cs3por.id, "WRITTEN", "Diagnóstico — leitura");
  await db.eduDiagnosticItem.create({ data: { diagnosticId: diag.id, skillId: porSkills[0].id, order: 1, activityId: diagAct.id } });

  console.log("\nOK. Codigos de familia (para teste de acesso):");
  console.log("  Ana   (nasc. 2015-04-10):", anaCode);
  console.log("  Pedro (nasc. 2018-08-22):", pedroCode);
  console.log("Responsavel: Maria Souza <maria.souza@exemplo.demo>");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });

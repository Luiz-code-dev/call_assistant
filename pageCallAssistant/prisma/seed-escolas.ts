/**
 * seed-escolas.ts
 * Seed de demonstração para a Área Escolar (SpeakFlow Escolas).
 * Cria: 1 rede, 3 escolas, 1 ano letivo com 4 bimestres,
 *       6 componentes, matriz 6º–9º ano, 4 turmas, 1 membro de cada perfil,
 *       60 alunos fictícios distribuídos nas turmas.
 *
 * Uso: npx ts-node prisma/seed-escolas.ts
 * Requer: DATABASE_URL no ambiente.
 */

import { PrismaClient, EduRole, EduStage, EduShift, EduEnrollmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedBnccMatrix } from "./seed-bncc";

const db = new PrismaClient();

const NETWORK_ID_PLACEHOLDER = "SEED_NETWORK";

function codeFor(prefix: string, i: number) {
  return `${prefix}${String(i).padStart(4, "0")}`;
}

function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}

const SUBJECTS = [
  { name: "Língua Portuguesa", area: "Linguagens", color: "#2563EB" },
  { name: "Matemática", area: "Matemática", color: "#16A34A" },
  { name: "Língua Inglesa", area: "Linguagens", color: "#7C3AED" },
  { name: "Ciências", area: "Ciências da Natureza", color: "#0891B2" },
  { name: "História", area: "Ciências Humanas", color: "#D97706" },
  { name: "Geografia", area: "Ciências Humanas", color: "#DC2626" },
];

const GRADE_CONFIG = {
  scale: 10,
  minAverage: 5,
  decimalPlaces: 1,
  rounding: "half_up",
  averageType: "weighted",
  recoveryRule: "replaces_if_higher",
};

async function main() {
  console.log("🌱 Iniciando seed da Área Escolar...");

  // ── Rede de Ensino ──────────────────────────────────────────────
  const network = await db.eduNetwork.upsert({
    where: { ibgeCode: "3550308" },
    update: {},
    create: {
      name: "Secretaria Municipal de Educação de São Paulo (Demo)",
      city: "São Paulo",
      state: "SP",
      ibgeCode: "3550308",
      isActive: true,
      gradeConfig: GRADE_CONFIG,
    },
  });
  console.log(`✅ Rede: ${network.name}`);

  // ── Escolas ─────────────────────────────────────────────────────
  const schoolData = [
    { name: "EMEF Professor Demo Silva", inepCode: "35000001" },
    { name: "EMEF Professora Demo Santos", inepCode: "35000002" },
    { name: "EMEF Demo Central", inepCode: "35000003" },
  ];

  const schools = await Promise.all(
    schoolData.map((s) =>
      db.eduSchool.upsert({
        where: { networkId_inepCode: { networkId: network.id, inepCode: s.inepCode } },
        update: {},
        create: { networkId: network.id, name: s.name, inepCode: s.inepCode, isActive: true },
      })
    )
  );
  console.log(`✅ ${schools.length} escolas criadas`);

  // ── Ano letivo 2027 com 4 bimestres ─────────────────────────────
  const schoolYear = await db.eduSchoolYear.upsert({
    where: { networkId_year: { networkId: network.id, year: 2027 } },
    update: {},
    create: {
      networkId: network.id,
      year: 2027,
      startsAt: new Date("2027-02-03"),
      endsAt: new Date("2027-12-19"),
      isCurrent: true,
    },
  });

  const terms = [
    { order: 1, name: "1º Bimestre", startsAt: "2027-02-03", endsAt: "2027-04-11" },
    { order: 2, name: "2º Bimestre", startsAt: "2027-04-28", endsAt: "2027-07-04" },
    { order: 3, name: "3º Bimestre", startsAt: "2027-07-28", endsAt: "2027-10-01" },
    { order: 4, name: "4º Bimestre", startsAt: "2027-10-18", endsAt: "2027-12-19" },
  ];

  for (const t of terms) {
    await db.eduTerm.upsert({
      where: { schoolYearId_order: { schoolYearId: schoolYear.id, order: t.order } },
      update: {},
      create: {
        schoolYearId: schoolYear.id,
        name: t.name,
        order: t.order,
        startsAt: new Date(t.startsAt),
        endsAt: new Date(t.endsAt),
        status: "OPEN",
      },
    });
  }
  console.log(`✅ Ano letivo 2027 com 4 bimestres`);

  // ── Componentes curriculares ─────────────────────────────────────
  const subjects = await Promise.all(
    SUBJECTS.map((s) =>
      db.eduSubject.upsert({
        where: { networkId_name: { networkId: network.id, name: s.name } },
        update: {},
        create: { networkId: network.id, ...s, isActive: true },
      })
    )
  );
  console.log(`✅ ${subjects.length} componentes`);

  // ── Matriz curricular: 6º ao 9º ano, Fundamental anos finais, todos os turnos ─
  const gradeYears = [6, 7, 8, 9];
  const weeklyHours: Record<string, number> = {
    "Língua Portuguesa": 5,
    "Matemática": 5,
    "Língua Inglesa": 2,
    "Ciências": 3,
    "História": 2,
    "Geografia": 2,
  };

  for (const subject of subjects) {
    for (const grade of gradeYears) {
      const existing = await db.eduCurriculumItem.findFirst({
        where: {
          networkId: network.id,
          subjectId: subject.id,
          stage: EduStage.ELEMENTARY_LATE,
          gradeYear: grade,
          shift: null,
        },
      });
      if (!existing) {
        await db.eduCurriculumItem.create({
          data: {
            networkId: network.id,
            subjectId: subject.id,
            stage: EduStage.ELEMENTARY_LATE,
            gradeYear: grade,
            weeklyHours: weeklyHours[subject.name] ?? 2,
          },
        });
      }
    }
  }
  console.log(`✅ Matriz curricular: ${subjects.length} componentes × ${gradeYears.length} anos`);

  // ── Turmas (uma por grau, na escola 1) ──────────────────────────
  const classData = [
    { name: "6º A", gradeYear: 6, accessCode: "SF2027-6A" },
    { name: "7º B", gradeYear: 7, accessCode: "SF2027-7B" },
    { name: "8º A", gradeYear: 8, accessCode: "SF2027-8A" },
    { name: "9º B", gradeYear: 9, accessCode: "SF2027-9B" },
  ];

  const classes = await Promise.all(
    classData.map((c) =>
      db.eduClass.upsert({
        where: { accessCode: c.accessCode },
        update: {},
        create: {
          networkId: network.id,
          schoolId: schools[0].id,
          schoolYearId: schoolYear.id,
          name: c.name,
          stage: EduStage.ELEMENTARY_LATE,
          gradeYear: c.gradeYear,
          shift: EduShift.MORNING,
          accessCode: c.accessCode,
          isActive: true,
        },
      })
    )
  );
  console.log(`✅ ${classes.length} turmas`);

  // ── EduClassSubject: gerar ofertas pela matriz ───────────────────
  for (const cls of classes) {
    for (const subject of subjects) {
      await db.eduClassSubject.upsert({
        where: { classId_subjectId: { classId: cls.id, subjectId: subject.id } },
        update: {},
        create: {
          networkId: network.id,
          classId: cls.id,
          subjectId: subject.id,
          isExtra: false,
        },
      });
    }
  }
  console.log(`✅ ${classes.length * subjects.length} ofertas (EduClassSubject)`);

  // ── Usuários demo (um por perfil) ───────────────────────────────
  const profileUsers = [
    { email: "gestor.demo@speakflow.escola", name: "Gestor Demo", role: EduRole.NETWORK_ADMIN, schoolId: null },
    { email: "coord.demo@speakflow.escola", name: "Coordenação Demo", role: EduRole.COORDINATOR, schoolId: null },
    { email: "direcao.demo@speakflow.escola", name: "Direção Demo", role: EduRole.SCHOOL_ADMIN, schoolId: schools[0].id },
    { email: "prof.demo@speakflow.escola", name: "Professor Demo", role: EduRole.TEACHER, schoolId: schools[0].id },
  ];

  for (const p of profileUsers) {
    const passwordHash = await bcrypt.hash("Speakflow@2027", 10);
    const user = await db.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        name: p.name,
        email: p.email,
        password: passwordHash,
        emailVerified: true,
        acceptedTerms: true,
        plan: "free",
      },
    });

    const existing = await db.eduMembership.findFirst({
      where: { networkId: network.id, userId: user.id, schoolId: p.schoolId ?? null, role: p.role },
    });
    if (!existing) {
      await db.eduMembership.create({
        data: { networkId: network.id, userId: user.id, schoolId: p.schoolId, role: p.role, isActive: true },
      });
    }
  }
  console.log(`✅ 4 usuários demo (um por perfil)`);

  // ── 60 alunos fictícios distribuídos nas 4 turmas ───────────────
  const firstNames = ["Ana","Bruno","Carlos","Diana","Eduardo","Fernanda","Gabriel","Helena","Igor","Julia","Kevin","Laura","Marcos","Nicole","Otávio","Paula","Rafael","Sofia","Thiago","Valentina"];
  const lastNames = ["Silva","Santos","Oliveira","Costa","Souza","Lima","Ferreira","Alves","Pereira","Rodrigues"];

  let studentCount = 0;
  for (let i = 0; i < 60; i++) {
    const cls = classes[i % 4];
    const first = firstNames[i % firstNames.length];
    const last = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const fullName = `${first} ${last}`;
    const enrollmentCode = codeFor("2027", i + 1);
    const pin = randomPin();
    const pinHash = await hashPin(pin);

    const student = await db.eduStudent.upsert({
      where: { networkId_enrollmentCode: { networkId: network.id, enrollmentCode } },
      update: {},
      create: {
        networkId: network.id,
        enrollmentCode,
        fullName,
        birthDate: new Date(`${2014 - Math.floor(i / 20)}-0${(i % 9) + 1}-15`),
        pinHash,
        isActive: true,
      },
    });

    const existingEnrollment = await db.eduEnrollment.findFirst({
      where: { studentId: student.id, schoolYearId: schoolYear.id },
    });
    if (!existingEnrollment) {
      await db.eduEnrollment.create({
        data: {
          networkId: network.id,
          studentId: student.id,
          classId: cls.id,
          schoolYearId: schoolYear.id,
          status: EduEnrollmentStatus.ACTIVE,
        },
      });
    }
    studentCount++;
  }
  console.log(`✅ ${studentCount} alunos criados e enturmados`);

  console.log("\n🎉 Seed da Área Escolar concluído com sucesso!");
  console.log(`   Rede: ${network.name} (id: ${network.id})`);
  console.log(`   Escolas: ${schools.map((s) => s.name).join(", ")}`);
  console.log(`   Usuários demo: gestor.demo@speakflow.escola | coord.demo@speakflow.escola | direcao.demo@speakflow.escola | prof.demo@speakflow.escola`);
  console.log(`   Senha de todos: Speakflow@2027`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

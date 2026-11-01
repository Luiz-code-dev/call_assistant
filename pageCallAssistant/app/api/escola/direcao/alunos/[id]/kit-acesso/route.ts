/**
 * POST /api/escola/direcao/alunos/[id]/kit-acesso
 * Gera o kit de acesso individual de um aluno (PIN ou sequência de figuras).
 *
 * Regra: o PIN/figuras é retornado em PLAINTEXT apenas nesta resposta.
 *        Depois, só o hash fica armazenado — não é possível recuperar sem gerar um novo.
 *
 * Acesso: SCHOOL_ADMIN e NETWORK_ADMIN. Professor recebe 403.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { studentSecret } from "@/lib/escola/secrets";
import { publicOrigin } from "@/lib/escola/public-url";

/** Figuras disponíveis (mesma lista de aluno/entrar/page.tsx). */
const FIGURE_IDS = ["sun","star","heart","house","fish","flower","moon","drop","cloud"] as const;

function randomFigures(count = 3): string[] {
  const pool = [...FIGURE_IDS];
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = randomInt(pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function randomPin4(): string {
  return String(randomInt(1000, 10000)).padStart(4, "0");
}

async function signCardToken(studentId: string, cardVersion: number, nid: string): Promise<string> {
  return new SignJWT({ studentId, cardVersion, nid })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("student-card")
    .setIssuedAt()
    .sign(studentSecret());
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["SCHOOL_ADMIN", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão. Apenas direção e secretaria geram o kit de acesso." }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;

  // Verifica que o aluno pertence à rede (e, se SCHOOL_ADMIN, à escola)
  const student = await P.eduStudent.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    select: { id: true, fullName: true, networkId: true, loginMode: true, cardVersion: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  if (ctx.schoolId) {
    const enr = await P.eduEnrollment.findFirst({
      where: { studentId: params.id, networkId: ctx.networkId, status: "ACTIVE", class: { schoolId: ctx.schoolId } },
    });
    if (!enr) return NextResponse.json({ error: "Aluno não pertence a esta escola" }, { status: 403 });
  }

  const origin = publicOrigin(req);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;

  let plainCredential: string | string[];
  let updateData: Record<string, unknown>;

  if (student.loginMode === "PICTURE") {
    const figures = randomFigures(3);
    const pictureSecretHash = await bcrypt.hash(figures.join(","), 10);
    plainCredential = figures;
    updateData = { pictureSecretHash, pinFailedCount: 0, pinLockedUntil: null };
  } else {
    const pin = randomPin4();
    const pinHash = await bcrypt.hash(pin, 10);
    plainCredential = pin;
    updateData = { pinHash, pinFailedCount: 0, pinLockedUntil: null };
  }

  await P.eduStudent.update({ where: { id: params.id }, data: updateData });

  // QR token assinado com a versão atual do cartão
  const qrToken = await signCardToken(params.id, student.cardVersion, student.networkId);
  const qrUrl = `${baseUrl}/escola/aluno/entrar?card=${encodeURIComponent(qrToken)}`;

  // Auditoria
  await P.eduAuditLog.create({
    data: {
      networkId: ctx.networkId,
      actorType: "user",
      actorId: ctx.userId,
      action: "student.kit.generated",
      entity: "EduStudent",
      entityId: params.id,
    },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    studentId: params.id,
    fullName: student.fullName,
    loginMode: student.loginMode,
    // Retornado em plaintext APENAS nesta resposta
    ...(student.loginMode === "PICTURE" ? { figures: plainCredential } : { pin: plainCredential }),
    qrUrl,
    qrToken,
    cardVersion: student.cardVersion,
  });
}

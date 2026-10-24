import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { EduRole } from "@/lib/escola/types";
import { db } from "@/lib/db";
import { staffSecret, studentSecret } from "@/lib/escola/secrets";

export async function resolverVinculos(userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).eduMembership.findMany({
    where: { userId, isActive: true, network: { isActive: true } },
    include: {
      network: { select: { id: true, name: true } },
      school: { select: { id: true, name: true } },
    },
    orderBy: [{ networkId: "asc" }, { schoolId: "asc" }],
  });
}

export function rotaDoPapel(role: string): string {
  switch (role) {
    case "PLATFORM_ADMIN": return "/escola/plataforma";
    case "NETWORK_ADMIN":  return "/escola/rede";
    case "COORDINATOR":    return "/escola/coordenacao";
    case "SCHOOL_ADMIN":   return "/escola/direcao";
    case "TEACHER":        return "/escola/professor";
    default:               return "/escola/entrar";
  }
}

export interface EduContext {
  userId: string;
  networkId: string;
  schoolId: string | null;
  role: EduRole;
  membershipId: string;
}

export interface StudentContext {
  studentId: string;
  networkId: string;
  enrollmentId: string;
  classId: string;
}


export async function getEduContext(): Promise<EduContext | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get("sf_edu_ctx")?.value;
  if (!raw) return null;

  try {
    const { payload } = await jwtVerify(raw, staffSecret());

    // PLATFORM_ADMIN tokens carry role directly — no EduMembership
    if (payload["role"] === "PLATFORM_ADMIN") {
      const userId = payload["sub"] as string | undefined;
      if (!userId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = await (db as any).eduPlatformAdmin.findUnique({ where: { userId }, select: { isActive: true } });
      if (!admin?.isActive) return null;
      return { userId, networkId: "", schoolId: null, role: "PLATFORM_ADMIN" as EduRole, membershipId: "" };
    }

    const membershipId = payload["mid"] as string | undefined;
    if (!membershipId) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membership = await (db as any).eduMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, userId: true, networkId: true, schoolId: true, role: true, isActive: true },
    });
    if (!membership || !membership.isActive) return null;

    return {
      userId: membership.userId,
      networkId: membership.networkId,
      schoolId: membership.schoolId,
      role: membership.role,
      membershipId: membership.id,
    };
  } catch {
    return null;
  }
}

// C: cache leve de revalidação por 60 s para evitar queries excessivas
const revalidationCache = new Map<string, { ok: boolean; ts: number }>();
const REVALIDATE_TTL_MS = 60_000;

export async function getStudentContext(): Promise<StudentContext | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get("sf_edu_student")?.value;
  if (!raw) return null;

  try {
    const { payload } = await jwtVerify(raw, studentSecret());
    const studentId = payload["sub"] as string | undefined;
    const networkId = payload["nid"] as string | undefined;
    const enrollmentId = payload["eid"] as string | undefined;
    const classId = payload["cid"] as string | undefined;

    if (!studentId || !networkId || !enrollmentId || !classId) return null;

    // C: revalida no banco (com cache) — garante aluno ativo, matrícula ativa, rede não suspensa
    const cacheKey = `${studentId}:${enrollmentId}`;
    const cached = revalidationCache.get(cacheKey);
    if (!cached || Date.now() - cached.ts > REVALIDATE_TTL_MS) {
      const enrollment = await (db as any).eduEnrollment.findUnique({
        where: { id: enrollmentId },
        select: {
          status: true,
          student: {
            select: {
              isActive: true,
              network: { select: { isActive: true } },
            },
          },
        },
      });
      const ok =
        enrollment?.status === "ACTIVE" &&
        enrollment?.student?.isActive === true &&
        enrollment?.student?.network?.isActive === true;
      revalidationCache.set(cacheKey, { ok, ts: Date.now() });
      if (!ok) return null;
    } else if (!cached.ok) {
      return null;
    }

    return { studentId, networkId, enrollmentId, classId };
  } catch {
    return null;
  }
}

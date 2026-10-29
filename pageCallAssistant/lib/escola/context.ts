import { cookies } from "next/headers";
import { EduRole } from "@/lib/escola/types";
import { staffSecret, studentSecret } from "@/lib/escola/secrets";
import { bearerToken, verifyTypedToken } from "@/lib/escola/app-auth";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { findPlatformAdmin } from "@/lib/escola/catalogo";
import { setTenantDb } from "@/lib/escola/db";

export async function resolverVinculos(userId: string, networkId: string) {
  const db = await getTenantDb(networkId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).eduMembership.findMany({
    where: { userId, isActive: true },
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
}

export interface StudentContext {
  studentId: string;
  networkId: string;
  enrollmentId: string;
  classId: string;
}

export async function getEduContext(): Promise<EduContext | null> {
  const raw = bearerToken() ?? cookies().get("sf_edu_ctx")?.value;
  if (!raw) return null;

  const payload = await verifyTypedToken(raw, staffSecret(), "staff");
  if (!payload) return null;

  try {
    // PLATFORM_ADMIN: revalida no catálogo a cada request
    if (payload["role"] === "PLATFORM_ADMIN") {
      const userId = payload["sub"] as string | undefined;
      if (!userId) return null;
      const { findPlatformAdmin } = await import("@/lib/escola/catalogo");
      const admin = await findPlatformAdmin(userId);
      if (!admin || !admin.isActive) return null;
      return { userId, networkId: "", schoolId: null, role: "PLATFORM_ADMIN" as EduRole, membershipId: "" };
    }

    const membershipId = payload["mid"] as string | undefined;
    const networkId   = payload["nid"] as string | undefined;
    if (!membershipId || !networkId) return null;

    // Usa getTenantDb(networkId) — rota o acesso para a base correta.
    // Também injeta no AsyncLocalStorage via setTenantDb para compatibilidade
    // com rotas que ainda usam prismaEdu.
    const db = await getTenantDb(networkId);
    setTenantDb(db);
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
      db,
    };
  } catch {
    return null;
  }
}

// Cache leve de revalidação por 60 s
const revalidationCache = new Map<string, { ok: boolean; ts: number }>();
const REVALIDATE_TTL_MS = 60_000;

export async function getStudentContext(): Promise<StudentContext | null> {
  const raw = bearerToken() ?? cookies().get("sf_edu_student")?.value;
  if (!raw) return null;

  const payload = await verifyTypedToken(raw, studentSecret(), "student");
  if (!payload) return null;

  try {
    const studentId   = payload["sub"] as string | undefined;
    const networkId   = payload["nid"] as string | undefined;
    const enrollmentId = payload["eid"] as string | undefined;
    const classId     = payload["cid"] as string | undefined;

    if (!studentId || !networkId || !enrollmentId || !classId) return null;

    const cacheKey = `${studentId}:${enrollmentId}`;
    const cached = revalidationCache.get(cacheKey);
    if (!cached || Date.now() - cached.ts > REVALIDATE_TTL_MS) {
      const db = await getTenantDb(networkId);
      setTenantDb(db); // injeta no AsyncLocalStorage para prismaEdu
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrollment = await (db as any).eduEnrollment.findUnique({
        where: { id: enrollmentId },
        select: { status: true, student: { select: { isActive: true } } },
      });
      const ok = enrollment?.status === "ACTIVE" && enrollment?.student?.isActive === true;
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

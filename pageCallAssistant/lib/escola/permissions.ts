import { EduRole } from "@/lib/escola/types";

export type EduAction =
  | "network:read"
  | "network:write"
  | "school:read"
  | "school:write"
  | "class:read"
  | "class:write"
  | "student:read"
  | "student:write"
  | "grade:read"
  | "grade:enter"
  | "grade:correct:request"
  | "grade:correct:decide"
  | "grade:publish"
  | "term:close"
  | "plan:read"
  | "plan:write"
  | "plan:approve"
  | "topic:read"
  | "topic:write"
  | "assessment:read"
  | "assessment:write"
  | "audit:read"
  | "membership:manage";

const ROLE_PERMISSIONS: Record<EduRole, EduAction[]> = {
  NETWORK_ADMIN: [
    "network:read",
    "network:write",
    "school:read",
    "school:write",
    "class:read",
    "class:write",
    "student:read",
    "student:write",
    "grade:read",
    "grade:enter",
    "grade:correct:request",
    "grade:correct:decide",
    "grade:publish",
    "term:close",
    "plan:read",
    "plan:write",
    "plan:approve",
    "topic:read",
    "topic:write",
    "assessment:read",
    "assessment:write",
    "audit:read",
    "membership:manage",
  ],
  COORDINATOR: [
    "network:read",
    "school:read",
    "school:write",
    "class:read",
    "class:write",
    "student:read",
    "student:write",
    "grade:read",
    "grade:correct:decide",
    "grade:publish",
    "term:close",
    "plan:read",
    "plan:write",
    "plan:approve",
    "topic:read",
    "topic:write",
    "assessment:read",
    "assessment:write",
    "audit:read",
  ],
  SCHOOL_ADMIN: [
    "network:read",
    "school:read",
    "class:read",
    "student:read",
    "grade:read",
    "grade:correct:request",
    "grade:correct:decide",
    "grade:publish",
    "term:close",
    "plan:read",
    "plan:approve",
    "topic:read",
    "assessment:read",
    "audit:read",
  ],
  TEACHER: [
    "class:read",
    "student:read",
    "grade:read",
    "grade:enter",
    "grade:correct:request",
    "plan:read",
    "plan:write",
    "topic:read",
    "topic:write",
    "assessment:read",
    "assessment:write",
  ],
  PLATFORM_ADMIN: [
    "network:read",
    "network:write",
    "school:read",
    "class:read",
    "student:read",
    "grade:read",
    "audit:read",
    "membership:manage",
  ],
};

export function can(role: EduRole, action: EduAction): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

export function canAny(role: EduRole, actions: EduAction[]): boolean {
  return actions.some((a) => can(role, a));
}

export function canAll(role: EduRole, actions: EduAction[]): boolean {
  return actions.every((a) => can(role, a));
}

/**
 * Asserts that the given context can MANAGE (create/edit/delete activities,
 * enter grades) a class subject. Throws an error with HTTP-ready code if not.
 *
 * Rules:
 * - TEACHER: must be the teacher of the class subject (teacherId === ctx.userId)
 * - COORDINATOR / NETWORK_ADMIN: any class subject in their network (read-only create on behalf)
 * - SCHOOL_ADMIN: scoped to their school
 */
export function assertCanManageClassSubject(
  ctx: { userId: string; networkId: string; schoolId: string | null; role: EduRole },
  classSubject: { teacherId: string | null; networkId: string; schoolId: string },
): void {
  if (classSubject.networkId !== ctx.networkId) {
    throw Object.assign(new Error("Fora da rede"), { status: 403 });
  }
  if (ctx.role === "TEACHER") {
    if (classSubject.teacherId !== ctx.userId) {
      throw Object.assign(new Error("Você não é o professor desta oferta"), { status: 403 });
    }
  } else if (ctx.role === "SCHOOL_ADMIN") {
    if (ctx.schoolId && classSubject.schoolId !== ctx.schoolId) {
      throw Object.assign(new Error("Escola fora do seu escopo"), { status: 403 });
    }
  }
  // COORDINATOR and NETWORK_ADMIN pass for any class subject in the network
}

/**
 * Asserts that the given context can VIEW submissions/grades for a class subject.
 * Same as manage but SCHOOL_ADMIN can also view.
 */
export function assertCanViewClassSubject(
  ctx: { userId: string; networkId: string; schoolId: string | null; role: EduRole },
  classSubject: { teacherId: string | null; networkId: string; schoolId: string },
): void {
  if (classSubject.networkId !== ctx.networkId) {
    throw Object.assign(new Error("Fora da rede"), { status: 403 });
  }
  if (ctx.role === "TEACHER" && classSubject.teacherId !== ctx.userId) {
    throw Object.assign(new Error("Você não é o professor desta oferta"), { status: 403 });
  }
  if (ctx.role === "SCHOOL_ADMIN" && ctx.schoolId && classSubject.schoolId !== ctx.schoolId) {
    throw Object.assign(new Error("Escola fora do seu escopo"), { status: 403 });
  }
}

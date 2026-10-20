import { EduRole } from "@prisma/client";

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

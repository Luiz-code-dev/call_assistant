import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export type OrgRole = "owner" | "admin" | "member";

export interface OrgSession {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  role: OrgRole;
  memberId: string;
}

const ROLE_RANK: Record<string, number> = { owner: 3, admin: 2, member: 1 };

export function hasRole(role: OrgRole, minRole: OrgRole): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

export async function getOrgSession(orgSlug: string): Promise<OrgSession | null> {
  const session = await getSession();
  if (!session) return null;

  const org = await (db as any).organization.findUnique({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true },
  });
  if (!org) return null;

  const member = await (db as any).orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.sub } },
    select: { id: true, role: true },
  });
  if (!member) return null;

  return {
    userId: session.sub,
    email: session.email,
    name: session.name,
    orgId: org.id,
    role: member.role as OrgRole,
    memberId: member.id,
  };
}

export async function getOrgSessionById(orgId: string): Promise<OrgSession | null> {
  const session = await getSession();
  if (!session) return null;

  const member = await (db as any).orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.sub } },
    select: { id: true, role: true },
  });
  if (!member) return null;

  return {
    userId: session.sub,
    email: session.email,
    name: session.name,
    orgId,
    role: member.role as OrgRole,
    memberId: member.id,
  };
}

import type { EduRole } from "./types";

export type InviteScope = "none" | "network" | "school";

export interface InvitableRole {
  role: EduRole;
  scope: InviteScope;
  label: string;
  description: string;
}

export const CAN_INVITE: Record<EduRole, InvitableRole[]> = {
  PLATFORM_ADMIN: [
    {
      role: "PLATFORM_ADMIN",
      scope: "none",
      label: "Administrador da plataforma",
      description: "Gerencia redes, convites e outros administradores da plataforma.",
    },
    {
      role: "NETWORK_ADMIN",
      scope: "network",
      label: "Gestor da rede",
      description: "Conduz a implantação e gerencia escolas, servidores e turmas da rede.",
    },
  ],
  NETWORK_ADMIN: [
    {
      role: "NETWORK_ADMIN",
      scope: "network",
      label: "Gestor da rede",
      description: "Gerencia escolas, servidores e turmas da rede.",
    },
    {
      role: "COORDINATOR",
      scope: "network",
      label: "Coordenação pedagógica",
      description: "Acompanha planos de ensino e retificações de notas.",
    },
    {
      role: "SCHOOL_ADMIN",
      scope: "school",
      label: "Direção escolar",
      description: "Gerencia turmas, alunos e atribuições da escola.",
    },
    {
      role: "TEACHER",
      scope: "school",
      label: "Professor(a)",
      description: "Lança notas e atividades das turmas atribuídas.",
    },
  ],
  SCHOOL_ADMIN: [
    {
      role: "COORDINATOR",
      scope: "school",
      label: "Coordenação pedagógica",
      description: "Acompanha planos de ensino da escola.",
    },
    {
      role: "TEACHER",
      scope: "school",
      label: "Professor(a)",
      description: "Lança notas e atividades das turmas atribuídas.",
    },
  ],
  COORDINATOR: [],
  TEACHER: [],
};

const INVITE_RESPONSIBLE: Partial<Record<EduRole, string>> = {
  TEACHER: "Gestor da rede ou Direção escolar",
  SCHOOL_ADMIN: "Gestor da rede",
  COORDINATOR: "Gestor da rede ou Direção escolar",
  NETWORK_ADMIN: "Administrador da plataforma",
  PLATFORM_ADMIN: "Administrador da plataforma",
};

export class InvitePermissionError extends Error {
  code = "INVITE_NOT_ALLOWED";
  status = 403;
  constructor(inviterRole: EduRole, targetRole: EduRole) {
    const responsible = INVITE_RESPONSIBLE[targetRole] ?? "papel responsável";
    const targetLabel = CAN_INVITE[inviterRole].find((r) => r.role === targetRole)?.label ?? targetRole;
    super(
      `Seu perfil não pode convidar ${targetLabel}. Quem convida é ${responsible}.`,
    );
  }
}

export function assertCanInvite(inviterRole: EduRole, targetRole: EduRole): void {
  const allowed = CAN_INVITE[inviterRole];
  const ok = allowed.some((r) => r.role === targetRole);
  if (!ok) throw new InvitePermissionError(inviterRole, targetRole);
}

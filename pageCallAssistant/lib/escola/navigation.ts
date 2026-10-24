import type { EduRole } from "./types";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const NAV_BY_ROLE: Record<EduRole, NavItem[]> = {
  PLATFORM_ADMIN: [
    { label: "Visão geral", href: "/escola/plataforma", icon: "LayoutDashboard" },
    { label: "Redes", href: "/escola/plataforma/redes", icon: "Building2" },
    { label: "Convites", href: "/escola/plataforma/convites", icon: "MailPlus" },
    { label: "Administradores", href: "/escola/plataforma/administradores", icon: "ShieldCheck" },
    { label: "Auditoria", href: "/escola/plataforma/auditoria", icon: "ScrollText" },
  ],
  NETWORK_ADMIN: [
    { label: "Visão geral", href: "/escola/rede", icon: "LayoutDashboard" },
    { label: "Implantação", href: "/escola/rede/implantacao", icon: "ListChecks" },
    { label: "Escolas", href: "/escola/rede/escolas", icon: "School" },
    { label: "Turmas e alunos", href: "/escola/rede/turmas", icon: "Users" },
    { label: "Servidores e convites", href: "/escola/rede/convites", icon: "UserPlus" },
    { label: "Matriz curricular", href: "/escola/rede/matriz", icon: "BookOpen" },
    { label: "Ano letivo e notas", href: "/escola/rede/anos-letivos", icon: "CalendarRange" },
    { label: "Auditoria", href: "/escola/rede/auditoria", icon: "FileCheck2" },
  ],
  COORDINATOR: [
    { label: "Visão geral", href: "/escola/coordenacao", icon: "LayoutDashboard" },
    { label: "Planos de ensino", href: "/escola/coordenacao/planos", icon: "BookCheck" },
    { label: "Retificações", href: "/escola/coordenacao/retificacoes", icon: "FilePen" },
  ],
  SCHOOL_ADMIN: [
    { label: "Visão geral", href: "/escola/direcao", icon: "LayoutDashboard" },
    { label: "Turmas e alunos", href: "/escola/direcao/turmas", icon: "Users" },
    { label: "Atribuições", href: "/escola/direcao/atribuicoes", icon: "Grid3x3" },
    { label: "Servidores e convites", href: "/escola/direcao/convites", icon: "UserPlus" },
    { label: "Cartões de acesso", href: "/escola/direcao/cartoes", icon: "QrCode" },
  ],
  TEACHER: [
    { label: "Minhas turmas", href: "/escola/professor", icon: "Users" },
    { label: "Abrir aula", href: "/escola/professor/aula", icon: "Presentation" },
  ],
};

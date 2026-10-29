import type { EduRole } from "./types";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const NAV_BY_ROLE: Record<EduRole, NavItem[]> = {
  PLATFORM_ADMIN: [
    { label: "Visão geral",     href: "/escola/plataforma",                 icon: "LayoutDashboard" },
    { label: "Redes",           href: "/escola/plataforma/redes",           icon: "Building2"       },
    { label: "Convites",        href: "/escola/plataforma/convites",        icon: "MailPlus"        },
    { label: "Administradores", href: "/escola/plataforma/administradores", icon: "ShieldCheck"     },
  ],
  NETWORK_ADMIN: [
    { label: "Visão geral",              href: "/escola/rede",                   icon: "LayoutDashboard" },
    { label: "Implantação",              href: "/escola/rede/implantacao",        icon: "ListChecks"      },
    { label: "Escolas",                  href: "/escola/rede/escolas",            icon: "School"          },
    { label: "Turmas e alunos",          href: "/escola/rede/turmas",             icon: "Users"           },
    { label: "Servidores e convites",    href: "/escola/rede/servidores",         icon: "UserPlus"        },
    { label: "Diagnósticos",             href: "/escola/rede/diagnosticos",       icon: "ClipboardList"   },
    { label: "Habilidades prioritárias", href: "/escola/rede/habilidades",        icon: "Target"          },
    { label: "Indicadores",              href: "/escola/rede/indicadores",        icon: "BarChart3"       },
    { label: "Auditoria",                href: "/escola/rede/auditoria",          icon: "ScrollText"      },
  ],
  COORDINATOR: [
    { label: "Visão geral",              href: "/escola/coordenacao",             icon: "LayoutDashboard" },
    { label: "Diagnósticos",             href: "/escola/coordenacao/diagnosticos",icon: "ClipboardList"   },
    { label: "Trilhas",                  href: "/escola/coordenacao/trilhas",     icon: "Route"           },
    { label: "Habilidades prioritárias", href: "/escola/coordenacao/habilidades", icon: "Target"          },
    { label: "Escolas e turmas",         href: "/escola/coordenacao/escolas",     icon: "School"          },
  ],
  SCHOOL_ADMIN: [
    { label: "Visão geral",       href: "/escola/direcao",             icon: "LayoutDashboard" },
    { label: "Turmas e alunos",   href: "/escola/direcao/turmas",      icon: "Users"           },
    { label: "Famílias",          href: "/escola/direcao/familias",    icon: "HeartHandshake"  },
    { label: "Atribuições",       href: "/escola/direcao/atribuicoes", icon: "Grid3x3"         },
    { label: "Cartões de acesso", href: "/escola/direcao/cartoes",     icon: "QrCode"          },
    { label: "Auditoria",         href: "/escola/direcao/auditoria",   icon: "ScrollText"      },
  ],
  TEACHER: [
    { label: "Minhas turmas",         href: "/escola/professor",            icon: "Users"         },
    { label: "Mapa da turma",         href: "/escola/professor/mapa",       icon: "Grid3x3"       },
    { label: "Trilhas",               href: "/escola/professor/trilhas",    icon: "Route"         },
    { label: "Abrir aula",            href: "/escola/professor/aula",       icon: "Presentation"  },
    { label: "Atividades",            href: "/escola/professor/atividades", icon: "BookOpen"      },
    { label: "Retornos para revisar", href: "/escola/professor/retornos",   icon: "MessageSquare" },
  ],
};

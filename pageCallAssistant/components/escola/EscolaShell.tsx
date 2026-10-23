"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EduRole } from "@/lib/escola/types";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_BY_ROLE: Record<EduRole, NavItem[]> = {
  NETWORK_ADMIN: [
    { label: "Implantação", href: "/escola/rede/implantacao", icon: "🚀" },
    { label: "Painel", href: "/escola/rede", icon: "🏠" },
    { label: "Importações", href: "/escola/rede/importacoes", icon: "📤" },
    { label: "Convites", href: "/escola/rede/convites", icon: "✉️" },
    { label: "Escolas", href: "/escola/rede/escolas", icon: "🏫" },
    { label: "Anos Letivos", href: "/escola/rede/anos-letivos", icon: "📅" },
    { label: "Componentes", href: "/escola/rede/componentes", icon: "📚" },
    { label: "Matriz Curricular", href: "/escola/rede/matriz", icon: "🗂️" },
    { label: "Turmas", href: "/escola/rede/turmas", icon: "👥" },
    { label: "Alunos", href: "/escola/rede/alunos", icon: "🎓" },
    { label: "Vínculos", href: "/escola/rede/vinculos", icon: "🔗" },
    { label: "Auditoria", href: "/escola/rede/auditoria", icon: "🔍" },
  ],
  COORDINATOR: [
    { label: "Painel", href: "/escola/coordenacao", icon: "🏠" },
    { label: "Planos de Ensino", href: "/escola/coordenacao/planos", icon: "📋" },
    { label: "Acompanhamento", href: "/escola/coordenacao/acompanhamento", icon: "📊" },
    { label: "Retificações", href: "/escola/coordenacao/retificacoes", icon: "✏️" },
    { label: "Auditoria", href: "/escola/coordenacao/auditoria", icon: "🔍" },
  ],
  SCHOOL_ADMIN: [
    { label: "Painel", href: "/escola/direcao", icon: "🏠" },
    { label: "Turmas", href: "/escola/direcao/turmas", icon: "👥" },
    { label: "Alunos", href: "/escola/direcao/alunos", icon: "🎓" },
    { label: "Atribuições", href: "/escola/direcao/atribuicoes", icon: "🗓️" },
    { label: "Cartões de Acesso", href: "/escola/direcao/cartoes", icon: "🪪" },
    { label: "Retificações", href: "/escola/direcao/retificacoes", icon: "✏️" },
    { label: "Auditoria", href: "/escola/direcao/auditoria", icon: "🔍" },
  ],
  TEACHER: [
    { label: "Minhas Turmas", href: "/escola/professor", icon: "🏠" },
    { label: "Abrir Aula", href: "/escola/professor/aula", icon: "📺" },
  ],
  PLATFORM_ADMIN: [
    { label: "Painel", href: "/escola/admin", icon: "🏛️" },
    { label: "Redes", href: "/escola/admin/redes", icon: "🌐" },
  ],
};

const ROLE_LABEL: Record<EduRole, string> = {
  NETWORK_ADMIN: "Gestor de Rede",
  COORDINATOR: "Coordenação",
  SCHOOL_ADMIN: "Direção",
  TEACHER: "Professor",
  PLATFORM_ADMIN: "Administrador da Plataforma",
};

const ROLE_COLOR: Record<EduRole, string> = {
  NETWORK_ADMIN: "bg-purple-600",
  COORDINATOR: "bg-blue-600",
  SCHOOL_ADMIN: "bg-green-600",
  TEACHER: "bg-orange-600",
  PLATFORM_ADMIN: "bg-gray-600",
};

interface Props {
  role: EduRole;
  networkName: string;
  userName: string;
  children: React.ReactNode;
}

export default function EscolaShell({ role, networkName, userName, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const nav = NAV_BY_ROLE[role] ?? [];

  async function handleLogout() {
    await fetch("/api/escola/auth/logout", { method: "POST" });
    router.push("/escola/entrar");
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <div className="text-purple-400 font-bold text-sm">SpeakFlow Escolas</div>
        <div className="text-white text-xs mt-1 truncate">{networkName}</div>
        <div className={`inline-flex items-center px-2 py-0.5 rounded text-white text-xs mt-2 ${ROLE_COLOR[role]}`}>
          {ROLE_LABEL[role]}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors min-h-[44px] ${
                active
                  ? "bg-purple-700 text-white font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className="text-gray-400 text-xs truncate mb-2">{userName}</div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-gray-500 hover:text-red-400 text-xs transition-colors"
        >
          Sair da área escolar
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-gray-900 border-r border-gray-800 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
          >
            <span className="text-xl">☰</span>
          </button>
          <div className="lg:hidden text-sm font-semibold text-purple-400">SpeakFlow Escolas</div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm hidden sm:block truncate max-w-[200px]">{userName}</span>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 text-xs transition-colors px-2 py-1 rounded hover:bg-gray-800 min-h-[44px] flex items-center"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

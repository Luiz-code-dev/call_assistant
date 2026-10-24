"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  MailPlus,
  ShieldCheck,
  ScrollText,
  ListChecks,
  School,
  Users,
  UserPlus,
  BookOpen,
  CalendarRange,
  FileCheck2,
  BookCheck,
  FilePen,
  Grid3x3,
  QrCode,
  Presentation,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import type { EduRole } from "@/lib/escola/types";
import { NAV_BY_ROLE } from "@/lib/escola/navigation";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  MailPlus,
  ShieldCheck,
  ScrollText,
  ListChecks,
  School,
  Users,
  UserPlus,
  BookOpen,
  CalendarRange,
  FileCheck2,
  BookCheck,
  FilePen,
  Grid3x3,
  QrCode,
  Presentation,
};

const ROLE_LABEL: Record<EduRole, string> = {
  PLATFORM_ADMIN: "Administrador da plataforma",
  NETWORK_ADMIN: "Gestor da rede",
  COORDINATOR: "Coordenação pedagógica",
  SCHOOL_ADMIN: "Direção escolar",
  TEACHER: "Professor(a)",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

interface Props {
  role: EduRole;
  userName: string;
  contextName?: string;
  children: React.ReactNode;
}

export default function EscAppShell({ role, userName, contextName, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const navItems = NAV_BY_ROLE[role] ?? [];

  async function handleLogout() {
    await fetch("/api/escola/auth/logout", { method: "POST" });
    router.push("/escola/entrar");
  }

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="text-indigo-600 font-bold text-base leading-none">SpeakFlow</div>
          <div className="text-indigo-400 text-[11px] font-semibold tracking-wide mt-0.5">ESCOLAS</div>
        </div>

        {/* Profile chip */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
            <div className="w-7 h-7 rounded bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0">
              {initials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-gray-800 leading-tight truncate">
                {ROLE_LABEL[role]}
              </div>
              {contextName && (
                <div className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                  {contextName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            const isExact = pathname === item.href;
            const isPrefix = !isExact && pathname.startsWith(item.href + "/");
            const active = isExact || isPrefix;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium min-h-[44px] transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon
                  size={20}
                  className={`shrink-0 ${active ? "text-indigo-600" : "text-gray-400"}`}
                />
                <span className="leading-snug">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-[11px] font-bold flex items-center justify-center shrink-0">
              {initials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-700 truncate">{userName}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-escola flex h-screen bg-[#F8F7FC] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[248px] shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[248px] transform transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0 h-[56px]">
          <button
            className="p-2 rounded-lg hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label="Menu"
          >
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-indigo-600 font-bold text-sm">SpeakFlow Escolas</span>
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center">
            {initials(userName)}
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

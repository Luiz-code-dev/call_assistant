"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, LayoutDashboard, Users, Target, BarChart3,
  Settings, ChevronLeft, Loader2, Menu, X, Award, LogOut, Home
} from "lucide-react";

interface OrgBasic {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: string;
}

function authFetch(url: string) {
  const token = typeof window !== "undefined"
    ? (sessionStorage.getItem("sf_token") || localStorage.getItem("sf_token"))
    : null;
  return fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const slug = params.slug as string;

  const [org, setOrg] = useState<OrgBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    authFetch(`/api/org`)
      .then(r => r.json())
      .then((orgs: OrgBasic[]) => {
        const found = Array.isArray(orgs) ? orgs.find(o => o.slug === slug) : null;
        if (!found) { router.push("/teams"); return; }
        setOrg(found);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const nav = [
    { href: `/teams/${slug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/teams/${slug}/members`, label: "Membros", icon: Users },
    { href: `/teams/${slug}/challenges`, label: "Desafios", icon: Target },
    { href: `/teams/${slug}/analytics`, label: "Analytics", icon: BarChart3 },
    { href: `/teams/${slug}/certifications`, label: "Certificações", icon: Award },
    { href: `/teams/${slug}/settings`, label: "Configurações", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
      </div>
    );
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-[#09090b] border-r border-zinc-800 w-56">
      <div className="p-4 border-b border-zinc-800">
        <Link href="/teams" className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs mb-3 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
          Todas as organizações
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            {org?.logoUrl
              ? <img src={org.logoUrl} alt={org.name} className="w-full h-full rounded-lg object-cover" />
              : <Building2 className="h-4 w-4 text-violet-400" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{org?.name}</p>
            <p className={`text-xs ${org?.role === "owner" ? "text-amber-400" : org?.role === "admin" ? "text-violet-400" : "text-zinc-500"}`}>
              {org?.role === "owner" ? "Owner" : org?.role === "admin" ? "Admin" : "Membro"}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-zinc-800 space-y-0.5">
        <Link
          href="/home"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          Meu painel
        </Link>
        <button
          onClick={() => {
            sessionStorage.removeItem("sf_token");
            localStorage.removeItem("sf_token");
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[#09090b]">
      <div className="hidden md:flex flex-shrink-0 w-56 flex-col" style={{ height: "100vh", position: "sticky", top: 0 }}>
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-[#09090b]">
          <button onClick={() => setMobileOpen(true)} className="text-zinc-400 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <Building2 className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-white">{org?.name}</span>
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

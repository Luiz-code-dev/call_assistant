"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Plus, Users, ChevronRight, Loader2, Globe, Briefcase } from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  industry: string | null;
  plan: string;
  role: string;
  _count: { members: number };
}

function authFetch(url: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined"
    ? (sessionStorage.getItem("sf_token") || localStorage.getItem("sf_token"))
    : null;
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

const INDUSTRY_LABELS: Record<string, string> = {
  technology: "Tecnologia",
  finance: "Financeiro",
  healthcare: "Saúde",
  education: "Educação",
  retail: "Varejo",
  manufacturing: "Manufatura",
  consulting: "Consultoria",
  other: "Outro",
};

export default function TeamsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/org")
      .then(r => r.json())
      .then(data => setOrgs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-12">

        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">SpeakFlow for Teams</h1>
            </div>
            <p className="text-zinc-400 text-sm">Infraestrutura de comunicação internacional com IA para equipes</p>
          </div>
          <button
            onClick={() => router.push("/teams/create")}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Organização
          </button>
        </div>

        {orgs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-zinc-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Nenhuma organização ainda</h2>
            <p className="text-zinc-400 text-sm mb-6 max-w-sm mx-auto">
              Crie a infraestrutura de comunicação da sua equipe e acompanhe a evolução em tempo real.
            </p>
            <button
              onClick={() => router.push("/teams/create")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              Criar minha organização
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {orgs.map(org => (
              <Link
                key={org.id}
                href={`/teams/${org.slug}/dashboard`}
                className="group flex items-center gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 p-5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  {org.logoUrl
                    ? <img src={org.logoUrl} alt={org.name} className="w-full h-full rounded-xl object-cover" />
                    : <Building2 className="h-6 w-6 text-violet-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{org.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      org.role === "owner" ? "bg-amber-500/15 text-amber-400" :
                      org.role === "admin" ? "bg-violet-500/15 text-violet-400" :
                      "bg-zinc-700 text-zinc-400"
                    }`}>
                      {org.role === "owner" ? "Owner" : org.role === "admin" ? "Admin" : "Membro"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {org._count?.members ?? 0} {(org._count?.members ?? 0) === 1 ? "membro" : "membros"}
                    </span>
                    {org.industry && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {INDUSTRY_LABELS[org.industry] ?? org.industry}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      {org.slug}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

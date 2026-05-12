"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Award, Plus, Loader2, Download, Star } from "lucide-react";
import { toast } from "sonner";

interface Cert {
  id: string;
  userId: string;
  level: string;
  score: number;
  fluency: number;
  consistency: number;
  issuedAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
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

const LEVEL_COLORS: Record<string, string> = {
  A1: "from-zinc-600 to-zinc-500",
  A2: "from-zinc-600 to-zinc-400",
  B1: "from-sky-700 to-sky-500",
  B2: "from-blue-700 to-blue-500",
  C1: "from-violet-700 to-violet-500",
  C2: "from-amber-600 to-amber-400",
};

export default function CertificationsPage() {
  const { slug } = useParams();
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function load() {
    const orgsRes = await authFetch("/api/org");
    const orgs = await orgsRes.json();
    const org = Array.isArray(orgs) ? orgs.find((o: any) => o.slug === slug) : null;
    if (!org) return;
    setOrgId(org.id);
    setOrgName(org.name);
    const res = await authFetch(`/api/org/${org.id}/certifications`);
    setCerts(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [slug]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await authFetch(`/api/org/${orgId}/certifications`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Erro ao gerar certificado."); setGenerating(false); return; }
    toast.success(`Certificado ${data.level} gerado com score ${data.score}!`);
    setGenerating(false);
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Certificações</h1>
          <p className="text-sm text-zinc-400">Certificados de comunicação corporativa em inglês</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {generating ? "Gerando..." : "Gerar meu certificado"}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 mb-6 flex items-start gap-4">
        <Star className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-white mb-1">Como funciona a certificação?</p>
          <p className="text-sm text-zinc-400">
            O certificado é gerado com base nas suas submissões de desafios corporativos.
            São necessárias pelo menos 3 submissões. O nível (A1–C1) e o score são calculados automaticamente pela IA.
          </p>
        </div>
      </div>

      {certs.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Award className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Nenhum certificado emitido ainda.</p>
          <p className="text-zinc-600 text-xs mt-1">Complete desafios corporativos para gerar seu certificado.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {certs.map(cert => (
            <div key={cert.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className={`bg-gradient-to-r ${LEVEL_COLORS[cert.level] ?? "from-zinc-700 to-zinc-600"} p-5`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-1">SpeakFlow for Teams</p>
                    <p className="text-2xl font-black text-white">{cert.level}</p>
                    <p className="text-sm text-white/80 font-medium">Corporate English Communication</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-white">{cert.score}</p>
                    <p className="text-xs text-white/60">score / 100</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {cert.user.avatarUrl
                      ? <img src={cert.user.avatarUrl} alt={cert.user.name} className="w-full h-full object-cover" />
                      : <span className="text-xs text-zinc-400">{cert.user.name[0]}</span>
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{cert.user.name}</p>
                    <p className="text-xs text-zinc-500">{orgName}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-zinc-500">Emitido em</p>
                    <p className="text-xs text-zinc-300">{new Date(cert.issuedAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-zinc-800/60 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Fluência</p>
                    <p className="text-lg font-bold text-white">{Math.round(cert.fluency)}<span className="text-xs text-zinc-500 font-normal">/100</span></p>
                  </div>
                  <div className="bg-zinc-800/60 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Consistência</p>
                    <p className="text-lg font-bold text-white">{Math.round(cert.consistency)}<span className="text-xs text-zinc-500 font-normal">/100</span></p>
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm font-medium transition-colors">
                  <Download className="h-3.5 w-3.5" />
                  Baixar certificado PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

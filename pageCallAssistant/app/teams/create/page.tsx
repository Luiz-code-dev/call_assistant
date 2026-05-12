"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowLeft, Loader2, Globe } from "lucide-react";

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

const INDUSTRIES = [
  { value: "technology", label: "Tecnologia" },
  { value: "finance", label: "Financeiro" },
  { value: "healthcare", label: "Saúde" },
  { value: "education", label: "Educação" },
  { value: "retail", label: "Varejo" },
  { value: "manufacturing", label: "Manufatura" },
  { value: "consulting", label: "Consultoria" },
  { value: "other", label: "Outro" },
];

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [domain, setDomain] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slugPreview = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authFetch("/api/org", {
        method: "POST",
        body: JSON.stringify({ name, industry: industry || null, domain: domain || null, cnpj: cnpj || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao criar organização."); return; }
      router.push(`/teams/${data.slug}/dashboard`);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link href="/teams" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para organizações
        </Link>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Criar Organização</h1>
              <p className="text-xs text-zinc-500">Configure o workspace da sua equipe</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Nome da organização <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Acme Corp"
                required
                minLength={2}
                maxLength={80}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              {name && (
                <p className="mt-1.5 text-xs text-zinc-500 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  speakf.com.br/teams/<span className="text-violet-400">{slugPreview}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Setor</label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="">Selecione o setor (opcional)</option>
                {INDUSTRIES.map(i => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                CNPJ
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00 (opcional, valida situação na Receita Federal)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <p className="mt-1 text-xs text-zinc-500">Apenas empresas com CNPJ ativo na Receita Federal são aceitas</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Domínio corporativo</label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="Ex: acme.com (opcional)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <p className="mt-1 text-xs text-zinc-500">Usado para identificar membros pelo domínio de e-mail</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando...</> : "Criar organização"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

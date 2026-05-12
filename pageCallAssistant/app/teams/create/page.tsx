"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, ArrowLeft, Loader2, Globe, CheckCircle2,
  XCircle, AlertCircle, Lock, ArrowRight,
} from "lucide-react";

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

function formatCnpj(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

const INDUSTRIES = [
  { value: "technology",    label: "Tecnologia" },
  { value: "finance",       label: "Financeiro" },
  { value: "healthcare",    label: "Saúde" },
  { value: "education",     label: "Educação" },
  { value: "retail",        label: "Varejo" },
  { value: "manufacturing", label: "Manufatura" },
  { value: "consulting",    label: "Consultoria" },
  { value: "other",         label: "Outro" },
];

type CnpjState = "idle" | "checking" | "valid" | "invalid";

export default function CreateOrgPage() {
  const router = useRouter();

  // ── access gate ──────────────────────────────────────────
  const [accessLoading, setAccessLoading]  = useState(true);
  const [hasAccess, setHasAccess]          = useState(false);

  useEffect(() => {
    authFetch("/api/org/access-check")
      .then(r => r.json())
      .then(d => setHasAccess(d.b2bAccess === true))
      .catch(() => setHasAccess(false))
      .finally(() => setAccessLoading(false));
  }, []);

  // ── form state ───────────────────────────────────────────
  const [name,     setName]     = useState("");
  const [industry, setIndustry] = useState("");
  const [domain,   setDomain]   = useState("");
  const [cnpj,     setCnpj]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // ── cnpj validation ──────────────────────────────────────
  const [cnpjState,   setCnpjState]   = useState<CnpjState>("idle");
  const [cnpjRazao,   setCnpjRazao]   = useState("");
  const [cnpjError,   setCnpjError]   = useState("");
  const cnpjTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCnpjChange(raw: string) {
    const formatted = formatCnpj(raw);
    setCnpj(formatted);
    setCnpjState("idle");
    setCnpjRazao("");
    setCnpjError("");

    const clean = formatted.replace(/\D/g, "");
    if (clean.length !== 14) return;

    if (cnpjTimer.current) clearTimeout(cnpjTimer.current);
    cnpjTimer.current = setTimeout(() => checkCnpj(clean), 600);
  }

  async function checkCnpj(clean: string) {
    setCnpjState("checking");
    try {
      const res  = await fetch(`/api/org/cnpj-check?cnpj=${clean}`);
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCnpjState("invalid");
        setCnpjError(data.error ?? "CNPJ inválido.");
        return;
      }
      if (!data.active) {
        setCnpjState("invalid");
        setCnpjError(`Situação na Receita Federal: ${data.situacao}. Apenas empresas ATIVAS são aceitas.`);
        return;
      }
      setCnpjState("valid");
      setCnpjRazao(data.razaoSocial);
    } catch {
      setCnpjState("invalid");
      setCnpjError("Erro ao consultar Receita Federal. Tente novamente.");
    }
  }

  const slugPreview = name
    .toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 48);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cnpj && cnpjState !== "valid") {
      setError("Aguarde a validação do CNPJ ou corrija o número informado.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res  = await authFetch("/api/org", {
        method: "POST",
        body: JSON.stringify({
          name,
          industry: industry || null,
          domain:   domain   || null,
          cnpj:     cnpj     || null,
        }),
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

  // ── loading ───────────────────────────────────────────────
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    );
  }

  // ── access blocked ────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-6">
            <Lock className="h-7 w-7 text-zinc-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-3">Acesso restrito</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            A criação de organizações corporativas é liberada após contato com nossa equipe comercial.
            Solicite uma demonstração e ativaremos o acesso para sua conta.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/for-teams#demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-colors">
              Solicitar acesso <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/teams" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Voltar para organizações
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── form ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link href="/teams" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />Voltar para organizações
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
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Nome da organização <span className="text-red-400">*</span>
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: Acme Corp" required minLength={2} maxLength={80}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors" />
              {name && (
                <p className="mt-1.5 text-xs text-zinc-500 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  speakf.com.br/teams/<span className="text-violet-400">{slugPreview}</span>
                </p>
              )}
            </div>

            {/* Setor */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Setor</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors">
                <option value="">Selecione o setor (opcional)</option>
                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>

            {/* CNPJ com máscara e validação */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">CNPJ</label>
              <div className="relative">
                <input type="text" value={cnpj}
                  onChange={e => handleCnpjChange(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  maxLength={18}
                  className={`w-full bg-zinc-800 border rounded-lg px-4 py-2.5 pr-10 text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                    cnpjState === "valid"   ? "border-emerald-500 focus:border-emerald-500" :
                    cnpjState === "invalid" ? "border-red-500 focus:border-red-500" :
                    "border-zinc-700 focus:border-violet-500"
                  }`} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {cnpjState === "checking" && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                  {cnpjState === "valid"    && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {cnpjState === "invalid"  && <XCircle className="h-4 w-4 text-red-400" />}
                </div>
              </div>

              {cnpjState === "checking" && (
                <p className="mt-1.5 text-xs text-zinc-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />Consultando Receita Federal...
                </p>
              )}
              {cnpjState === "valid" && (
                <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />Empresa ativa: <span className="font-semibold">{cnpjRazao}</span>
                </p>
              )}
              {cnpjState === "invalid" && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />{cnpjError}
                </p>
              )}
              {cnpjState === "idle" && (
                <p className="mt-1 text-xs text-zinc-600">Apenas empresas com CNPJ ativo na Receita Federal são aceitas</p>
              )}
            </div>

            {/* Domínio */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Domínio corporativo</label>
              <input type="text" value={domain} onChange={e => setDomain(e.target.value)}
                placeholder="Ex: acme.com (opcional)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors" />
              <p className="mt-1 text-xs text-zinc-500">Usado para identificar membros pelo domínio de e-mail</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
              </div>
            )}

            <button type="submit"
              disabled={loading || !name.trim() || cnpjState === "checking" || cnpjState === "invalid"}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : "Criar organização"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Settings, Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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

export default function OrgSettingsPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [myRole, setMyRole] = useState("member");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    authFetch("/api/org")
      .then(r => r.json())
      .then((orgs: any[]) => {
        const org = Array.isArray(orgs) ? orgs.find(o => o.slug === slug) : null;
        if (!org) return;
        setOrgId(org.id);
        setMyRole(org.role);
        setName(org.name);
        setIndustry(org.industry ?? "");
        setDomain(org.domain ?? "");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await authFetch(`/api/org/${orgId}`, {
      method: "PUT",
      body: JSON.stringify({ name, industry: industry || null, domain: domain || null }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Erro ao salvar."); setSaving(false); return; }
    toast.success("Configurações salvas.");
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja excluir esta organização? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    const res = await authFetch(`/api/org/${orgId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Organização excluída."); router.push("/teams"); }
    else toast.error("Erro ao excluir organização.");
    setDeleting(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
    </div>
  );

  const canEdit = myRole === "owner" || myRole === "admin";

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-1">Configurações</h1>
        <p className="text-sm text-zinc-400">Gerencie as informações da organização</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 mb-8">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nome da organização</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!canEdit}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Setor</label>
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            disabled={!canEdit}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="">Não especificado</option>
            {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Domínio corporativo</label>
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            disabled={!canEdit}
            placeholder="Ex: empresa.com"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        {canEdit && (
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        )}
      </form>

      {myRole === "owner" && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">Zona de perigo</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Excluir a organização remove permanentemente todos os dados: membros, desafios, analytics e certificações.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Excluir organização
          </button>
        </div>
      )}
    </div>
  );
}

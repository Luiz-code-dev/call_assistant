"use client";
import { useEffect, useMemo, useState } from "react";
import { SearchX, RefreshCw } from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface AuditLog {
  id: string; actorType: string; actorId: string; action: string; entity: string;
  entityId: string; metadata: Record<string, unknown> | null; ip: string | null; createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  "invite.sent": "Enviou um convite",
  "invite.accepted": "Aceitou um convite",
  "invite.cancelled": "Cancelou um convite",
  "school.created": "Criou uma escola",
  "school.updated": "Atualizou uma escola",
  "class.created": "Criou uma turma",
  "student.imported": "Importou alunos",
  "membership.created": "Vinculou um servidor",
  "membership.updated": "Atualizou um vínculo",
};

function actionText(action: string) {
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACTOR_LABEL: Record<string, string> = {
  user: "Equipe", student: "Aluno", guardian: "Família", system: "Sistema",
};

const inputCls =
  "bg-white text-[#1F1A2E] rounded-[10px] px-3 h-11 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none transition-colors";

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [pessoa, setPessoa] = useState("");
  const [periodo, setPeriodo] = useState("30d");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    const r = await fetch(`/api/escola/auditoria?${params}`);
    const data = await r.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [action]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = periodo === "7d" ? 7 : periodo === "30d" ? 30 : periodo === "90d" ? 90 : 0;
    return logs.filter((l) => {
      if (pessoa && !l.actorId.toLowerCase().includes(pessoa.toLowerCase())) return false;
      if (cutoff && now - new Date(l.createdAt).getTime() > cutoff * 86400000) return false;
      return true;
    });
  }, [logs, pessoa, periodo]);

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Auditoria" }]}
        title="Auditoria"
        subtitle="Registro das ações realizadas na rede."
        action={
          <button onClick={load} className="inline-flex items-center gap-2 border border-[#DDD6EE] hover:border-[#C4B5FD] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        }
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-wrap gap-3 mb-5">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={inputCls}>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="all">Todo o período</option>
          </select>
          <input value={pessoa} onChange={(e) => setPessoa(e.target.value)} placeholder="Filtrar por pessoa…" className={`${inputCls} w-52`} />
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filtrar por ação…" className={`${inputCls} w-52`} />
        </div>

        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E9E5F5] flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-4"><SearchX size={26} className="text-[#6D28D9]" /></div>
            <p className="text-[#1F1A2E] text-[15px] font-semibold">Nenhum registro encontrado</p>
            <p className="text-[#5B5470] text-sm mt-1 max-w-sm">Ajuste os filtros ou aguarde novas ações na rede.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[#5B5470] text-[12px] border-b border-[#E9E5F5]">
                    <th className="px-5 py-2.5 font-medium">Data/hora</th>
                    <th className="px-4 py-2.5 font-medium">Pessoa</th>
                    <th className="px-4 py-2.5 font-medium">Perfil</th>
                    <th className="px-4 py-2.5 font-medium">Ação</th>
                    <th className="px-4 py-2.5 font-medium">Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDF9]">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-[#FAF9FD] transition-colors">
                      <td className="px-5 py-3 text-[#5B5470] whitespace-nowrap">{new Date(l.createdAt).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-[#5B5470] font-mono text-[12px]">{l.actorId.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-[#5B5470]">{ACTOR_LABEL[l.actorType] ?? l.actorType}</td>
                      <td className="px-4 py-3 text-[#1F1A2E] font-medium">{actionText(l.action)}</td>
                      <td className="px-4 py-3 text-[#5B5470]">{l.entity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

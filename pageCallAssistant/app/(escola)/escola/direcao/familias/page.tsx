"use client";
import { useEffect, useState } from "react";
import { Search, UserCheck, Clock, UserX, Send } from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface StudentRow {
  id: string; fullName: string; enrollmentCode: string;
  situacao: "com_acesso" | "convite_pendente" | "sem_responsavel";
  turma: { id: string; name: string; gradeYear: number } | null;
}
interface Totais { comAcesso: number; convitePendente: number; semResponsavel: number; }

const SITUACAO: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  com_acesso:        { label: "Com acesso",       icon: <UserCheck size={13} />, bg: "bg-[#DCFCE7]", text: "text-[#166534]" },
  convite_pendente:  { label: "Convite pendente", icon: <Clock size={13} />,     bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  sem_responsavel:   { label: "Sem responsável",  icon: <UserX size={13} />,     bg: "bg-[#FEE2E2]", text: "text-[#B91C1C]" },
};

export default function FamiliasPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [totais, setTotais] = useState<Totais | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<"" | "com_acesso" | "convite_pendente" | "sem_responsavel">("");
  const [convite, setConvite] = useState<{ studentId: string; nome: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  useEffect(() => {
    fetch("/api/escola/direcao/familias")
      .then(r => { if (!r.ok) throw new Error("Erro"); return r.json(); })
      .then(d => { setStudents(d.students ?? []); setTotais(d.totais ?? null); setLoading(false); })
      .catch(() => { setError("Não foi possível carregar."); setLoading(false); });
  }, []);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.fullName.toLowerCase().includes(q) || s.enrollmentCode.includes(q) || (s.turma?.name.toLowerCase().includes(q) ?? false);
    const matchFiltro = !filtro || s.situacao === filtro;
    return matchSearch && matchFiltro;
  });

  async function convidar() {
    if (!convite || !inviteEmail.trim()) return;
    setInviting(true); setInviteMsg("");
    const r = await fetch("/api/escola/familia/convidar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: convite.studentId, email: inviteEmail.trim() }),
    });
    const d = await r.json().catch(() => ({}));
    setInviteMsg(r.ok ? "Convite enviado com sucesso." : (d.error ?? "Erro ao enviar convite."));
    setInviting(false);
    if (r.ok) setTimeout(() => { setConvite(null); setInviteEmail(""); setInviteMsg(""); }, 2000);
  }

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Direção", href: "/escola/direcao" }, { label: "Famílias" }]}
        title="Famílias"
        subtitle="Situação de acesso dos responsáveis por aluno."
      />

      <div className="px-7 py-6 max-w-[1200px] mx-auto w-full space-y-5">
        {/* Totais */}
        {totais && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "com_acesso",       val: totais.comAcesso,       label: "Com acesso" },
              { key: "convite_pendente", val: totais.convitePendente, label: "Convite pendente" },
              { key: "sem_responsavel",  val: totais.semResponsavel,  label: "Sem responsável" },
            ].map(k => (
              <button key={k.key} onClick={() => setFiltro(filtro === k.key as typeof filtro ? "" : k.key as typeof filtro)}
                className={`bg-white border rounded-2xl p-4 text-left transition-colors ${filtro === k.key ? "border-[#6D28D9]" : "border-[#E9E5F5] hover:border-[#C4B5FD]"}`}>
                <div className="text-[28px] font-extrabold text-[#1F1A2E]">{k.val}</div>
                <div className="text-[#5B5470] text-xs mt-1">{k.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-3.5 text-[#5B5470]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, matrícula ou turma…"
            className="w-full bg-white rounded-xl pl-9 pr-4 h-11 text-sm border border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-2 focus:ring-[#EDE9FE] outline-none text-[#1F1A2E]" />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : error ? (
          <div className="text-[#B91C1C] text-center py-8">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#5B5470]">Nenhum aluno encontrado.</div>
        ) : (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#5B5470] text-xs border-b border-[#E9E5F5]">
                  <th className="px-5 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Turma</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDF9]">
                {filtered.map(s => {
                  const sit = SITUACAO[s.situacao];
                  return (
                    <tr key={s.id} className="hover:bg-[#FAF9FD] transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-[#1F1A2E]">{s.fullName}</div>
                        <div className="text-[#5B5470] text-xs">{s.enrollmentCode}</div>
                      </td>
                      <td className="px-4 py-3 text-[#5B5470]">{s.turma?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${sit.bg} ${sit.text}`}>
                          {sit.icon} {sit.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.situacao === "sem_responsavel" && (
                          <button onClick={() => { setConvite({ studentId: s.id, nome: s.fullName }); setInviteEmail(""); setInviteMsg(""); }}
                            className="inline-flex items-center gap-1 text-[#6D28D9] text-xs font-semibold hover:underline">
                            <Send size={12} /> Convidar responsável
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal convidar */}
      {convite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-[#1F1A2E] font-bold text-lg mb-1">Convidar responsável</h3>
            <p className="text-[#5B5470] text-sm mb-4">Aluno: <strong>{convite.nome}</strong></p>
            <label className="text-[#5B5470] text-sm block mb-1.5">E-mail do responsável *</label>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="responsavel@email.com" type="email"
              className="w-full bg-white rounded-xl px-3 h-11 text-sm border border-[#DDD6EE] focus:border-[#6D28D9] outline-none mb-4" />
            {inviteMsg && <p className={`text-sm mb-3 ${inviteMsg.startsWith("Convite") ? "text-[#166534]" : "text-[#B91C1C]"}`}>{inviteMsg}</p>}
            <div className="flex gap-2">
              <button onClick={() => setConvite(null)} className="flex-1 border border-[#DDD6EE] text-[#5B5470] py-2.5 rounded-xl text-sm font-semibold">Cancelar</button>
              <button onClick={convidar} disabled={inviting || !inviteEmail.trim()}
                className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                {inviting ? "Enviando…" : "Enviar convite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

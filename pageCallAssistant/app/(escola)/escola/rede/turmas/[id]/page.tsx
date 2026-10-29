"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Users, UserPlus, X, AlertTriangle, CheckCircle2, Search, KeyRound, Copy, Trash2, RefreshCw,
} from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { STAGE_LABEL, SHIFT_LABEL, EduStage, EduShift } from "@/lib/escola/types";

const RELATIONS: { v: string; l: string }[] = [
  { v: "MAE", l: "Mãe" }, { v: "PAI", l: "Pai" }, { v: "AVO_AVO", l: "Avó/Avô" },
  { v: "TIO_TIA", l: "Tio/Tia" }, { v: "TUTOR_LEGAL", l: "Tutor legal" }, { v: "OUTRO", l: "Outro" },
];
const relLabel = (v: string) => RELATIONS.find((r) => r.v === v)?.l ?? v;

interface Guardian { linkId: string; guardianId: string; relation: string; name: string; email?: string; phone?: string; situacao: string }
interface Student { id: string; enrollmentCode: string; fullName: string; birthDate: string | null; guardians: { linkId: string; relation: string; name: string; situacao: string }[]; temResponsavel: boolean; familiaComAcesso: boolean }
interface ClassInfo { id: string; name: string; stage: EduStage; gradeYear: number; shift: EduShift; accessCode: string; schoolName: string; year: number; subjects: { name: string; color: string | null }[] }

const inputCls = "w-full bg-white text-[#1F1A2E] rounded-[10px] px-3 h-11 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none transition-colors";

function SituacaoChip({ s }: { s: string }) {
  const map: Record<string, { l: string; c: string }> = {
    ACOMPANHANDO: { l: "Acompanhando", c: "bg-[#DCFCE7] text-[#166534]" },
    SEM_ACESSO: { l: "Sem acesso", c: "bg-[#FAF9FD] text-[#5B5470]" },
  };
  const m = map[s] ?? map.SEM_ACESSO;
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${m.c}`}>{m.l}</span>;
}

export default function TurmaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [cls, setCls] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tab, setTab] = useState<"alunos" | "componentes" | "familias">("alunos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [manage, setManage] = useState<Student | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch(`/api/escola/turmas/${id}`);
      if (!r.ok) { setError(true); return; }
      const d = await r.json();
      setCls(d.class); setStudents(d.students ?? []);
    } catch { setError(true); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const comAcesso = students.filter((s) => s.familiaComAcesso).length;
  const semResp = students.filter((s) => !s.temResponsavel).length;

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Turmas", href: "/escola/rede/turmas" }, { label: cls?.name ?? "Turma" }]}
        title={cls ? cls.name : "Turma"}
        subtitle={cls ? `${cls.schoolName} · ${STAGE_LABEL[cls.stage]} · ${cls.gradeYear}º ano · ${SHIFT_LABEL[cls.shift]} · ${cls.year} · código ${cls.accessCode}` : undefined}
        action={
          <div className="flex items-center gap-2">
            <Link href="/escola/rede/importacoes?modelo=C" className="inline-flex items-center gap-2 border border-[#DDD6EE] hover:border-[#C4B5FD] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]">Importar alunos</Link>
            <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"><UserPlus size={14} /> Adicionar aluno</button>
          </div>
        }
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {([["alunos", `Alunos (${students.length})`], ["componentes", "Componentes"], ["familias", "Famílias"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[40px] transition-colors ${tab === k ? "bg-[#6D28D9] text-white" : "bg-white text-[#5B5470] border border-[#E9E5F5] hover:bg-[#F5F3FF] hover:text-[#1F1A2E]"}`}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : error ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4"><AlertTriangle size={26} className="text-[#B91C1C]" /></div>
            <h2 className="text-[16px] font-bold text-[#1F1A2E] mb-1">Não foi possível carregar a turma.</h2>
            <button onClick={load} className="mt-3 inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold min-h-[44px]"><RefreshCw size={15} /> Tentar de novo</button>
          </div>
        ) : tab === "componentes" ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5">
            <div className="flex flex-wrap gap-2">
              {(cls?.subjects ?? []).map((s, i) => (
                <span key={i} className="text-[12px] font-medium px-3 py-1 rounded-full" style={{ color: s.color ?? "#6D28D9", backgroundColor: (s.color ?? "#6D28D9") + "1A" }}>{s.name}</span>
              ))}
              {(cls?.subjects ?? []).length === 0 && <span className="text-[#5B5470] text-sm">Nenhum componente nesta turma.</span>}
            </div>
          </div>
        ) : tab === "familias" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E9E5F5] rounded-2xl p-4"><div className="text-[26px] font-extrabold text-[#166534]">{comAcesso}</div><div className="text-[12px] text-[#5B5470]">Famílias acompanhando</div></div>
            <div className="bg-white border border-[#E9E5F5] rounded-2xl p-4"><div className="text-[26px] font-extrabold text-[#1F1A2E]">{students.length - comAcesso}</div><div className="text-[12px] text-[#5B5470]">Sem acesso ainda</div></div>
            <div className="bg-white border border-[#E9E5F5] rounded-2xl p-4"><div className="text-[26px] font-extrabold text-[#B91C1C]">{semResp}</div><div className="text-[12px] text-[#5B5470]">Alunos sem responsável</div></div>
          </div>
        ) : (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[#5B5470] text-[12px] border-b border-[#E9E5F5]">
                    <th className="px-5 py-2.5 font-medium">Matrícula</th>
                    <th className="px-4 py-2.5 font-medium">Aluno</th>
                    <th className="px-4 py-2.5 font-medium">Responsáveis</th>
                    <th className="px-4 py-2.5 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDF9]">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FAF9FD] transition-colors">
                      <td className="px-5 py-3 font-mono text-[12px] text-[#5B5470]">{s.enrollmentCode}</td>
                      <td className="px-4 py-3 font-medium text-[#1F1A2E]">{s.fullName}</td>
                      <td className="px-4 py-3">
                        {s.guardians.length === 0 ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C]">Sem responsável</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {s.guardians.map((g) => (
                              <span key={g.linkId} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#4C1D95]">
                                {g.name} · {relLabel(g.relation)} <SituacaoChip s={g.situacao} />
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setManage(s)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6D28D9] hover:text-[#5B21B6]"><UserPlus size={14} /> Responsáveis</button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-12 text-center text-[#5B5470]"><div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><Users size={26} className="text-[#6D28D9]" /></div>Nenhum aluno nesta turma. Importe pela planilha (Modelo C).</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {manage && <ResponsaveisModal student={manage} onClose={() => setManage(null)} onChanged={load} />}
      {addOpen && <AddAlunoModal classId={id} onClose={() => setAddOpen(false)} onSaved={load} />}
    </div>
  );
}

function AddAlunoModal({ classId, onClose, onSaved }: { classId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ enrollmentCode: "", fullName: "", birthDate: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ pin: string; code: string | null } | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr("");
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const r = await fetch("/api/escola/alunos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, classId, pin }),
    });
    const d = await r.json();
    if (!r.ok) { setErr(d.error ?? "Erro ao salvar"); setSaving(false); return; }
    let code: string | null = null;
    try {
      const cr = await fetch(`/api/escola/alunos/${d.student.id}/codigo-familia`, { method: "POST" });
      if (cr.ok) code = (await cr.json()).code;
    } catch { /* ignore */ }
    setResult({ pin, code }); setSaving(false); onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1A2E]/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#1F1A2E]">Adicionar aluno</h2>
          <button onClick={onClose} className="text-[#5B5470] hover:text-[#1F1A2E] p-1"><X size={18} /></button>
        </div>
        {result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#166534] text-sm"><CheckCircle2 size={16} /> Aluno cadastrado nesta turma.</div>
            <div className="bg-[#FAF9FD] border border-[#E9E5F5] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between"><span className="text-[13px] text-[#5B5470]">PIN do aluno</span><span className="font-mono text-[16px] tracking-widest text-[#1F1A2E]">{result.pin}</span></div>
              {result.code && <div className="flex items-center justify-between"><span className="text-[13px] text-[#5B5470]">Código de família</span><span className="font-mono text-[16px] tracking-widest text-[#1F1A2E]">{result.code}</span></div>}
            </div>
            <p className="text-[11px] text-[#5B5470]">Anote e imprima no cartão de acesso. O PIN e o código só aparecem agora.</p>
            <button onClick={onClose} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px]">Concluir</button>
          </div>
        ) : (
          <form onSubmit={salvar} className="space-y-3">
            <input className={inputCls} placeholder="Matrícula" value={form.enrollmentCode} onChange={(e) => setForm((f) => ({ ...f, enrollmentCode: e.target.value }))} required />
            <input className={inputCls} placeholder="Nome completo" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
            <div>
              <label className="text-[12px] text-[#5B5470] block mb-1">Data de nascimento</label>
              <input className={inputCls} type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
            </div>
            {err && <p className="text-[#B91C1C] text-[13px]">{err}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] min-h-[44px]">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold min-h-[44px] disabled:opacity-50">{saving ? "Salvando…" : "Salvar"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ResponsaveisModal({ student, onClose, onChanged }: { student: Student; onClose: () => void; onChanged: () => void }) {
  const [list, setList] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", relation: "MAE", email: "", phone: "" });
  const [found, setFound] = useState<{ id: string; name: string; filhos: { fullName: string }[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pendingDesv, setPendingDesv] = useState<{ id: string } | null>(null);
  const [motivoDesv, setMotivoDesv] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/escola/alunos/${student.id}/responsaveis`);
    if (r.ok) setList((await r.json()).responsaveis ?? []);
    setLoading(false);
  }, [student.id]);
  useEffect(() => { load(); }, [load]);

  async function buscar(contato: string) {
    setFound(null);
    if (contato.trim().length < 3) return;
    const r = await fetch(`/api/escola/responsaveis/buscar?contato=${encodeURIComponent(contato.trim())}`);
    if (r.ok) { const d = await r.json(); if (d.guardian) setFound(d.guardian); }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr("");
    const body = found ? { guardianId: found.id, relation: form.relation } : { name: form.name, relation: form.relation, email: form.email, phone: form.phone };
    const r = await fetch(`/api/escola/alunos/${student.id}/responsaveis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { setErr(d.error ?? "Erro ao salvar"); setSaving(false); return; }
    if (d.invitePath) setInviteLink(`${window.location.origin}${d.invitePath}`);
    setForm({ name: "", relation: "MAE", email: "", phone: "" }); setFound(null); setSaving(false);
    load(); onChanged();
  }

  async function desvincular() {
    if (!pendingDesv || !motivoDesv.trim()) return;
    const r = await fetch(`/api/escola/alunos/${student.id}/responsaveis/${pendingDesv.id}/desvincular`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo: motivoDesv }) });
    if (r.ok) { setPendingDesv(null); setMotivoDesv(""); load(); onChanged(); }
  }

  async function gerarCodigo() {
    const r = await fetch(`/api/escola/alunos/${student.id}/codigo-familia`, { method: "POST" });
    if (r.ok) setFamilyCode((await r.json()).code);
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1A2E]/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-[15px] font-semibold text-[#1F1A2E]">Responsáveis</h2><p className="text-[12px] text-[#5B5470]">{student.fullName} · {student.enrollmentCode}</p></div>
          <button onClick={onClose} className="text-[#5B5470] hover:text-[#1F1A2E] p-1"><X size={18} /></button>
        </div>

        {loading ? <div className="text-[#5B5470] text-center py-6">Carregando…</div> : (
          <div className="space-y-2 mb-5">
            {list.length === 0 && <p className="text-[13px] text-[#5B5470]">Nenhum responsável vinculado ainda.</p>}
            {list.map((g) => (
              <div key={g.linkId} className="flex items-center justify-between gap-2 border border-[#E9E5F5] rounded-xl px-3 py-2">
                <div className="min-w-0"><div className="text-[13px] font-medium text-[#1F1A2E] truncate">{g.name} <span className="text-[#5B5470] font-normal">· {relLabel(g.relation)}</span></div><div className="text-[12px] text-[#5B5470] truncate">{g.email || g.phone || "—"}</div></div>
                <div className="flex items-center gap-2 shrink-0"><SituacaoChip s={g.situacao} /><button onClick={() => { setPendingDesv({ id: g.linkId }); setMotivoDesv(""); }} title="Desvincular" className="p-1.5 rounded-lg text-[#5B5470] hover:text-[#B91C1C] hover:bg-[#FEE2E2]"><Trash2 size={14} /></button></div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={salvar} className="space-y-3 border-t border-[#E9E5F5] pt-4">
          <h3 className="text-[13px] font-semibold text-[#1F1A2E]">Adicionar responsável</h3>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Celular" value={form.phone} onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); buscar(e.target.value); }} />
            <input className={inputCls} placeholder="E-mail" value={form.email} onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); buscar(e.target.value); }} />
          </div>
          {found ? (
            <div className="flex items-start gap-2 p-3 bg-[#EDE9FE] rounded-lg text-[12px] text-[#4C1D95]">
              <Search size={14} className="mt-0.5 shrink-0" />
              <div><b>{found.name}</b> já é responsável{found.filhos.length ? ` de ${found.filhos.map((f) => f.fullName).join(", ")}` : ""} na rede. Será ligado(a) também a este aluno (sem duplicar).</div>
            </div>
          ) : (
            <input className={inputCls} placeholder="Nome do responsável" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          )}
          <select className={inputCls} value={form.relation} onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))}>
            {RELATIONS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
          {err && <p className="text-[#B91C1C] text-[13px]">{err}</p>}
          <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] disabled:opacity-50"><CheckCircle2 size={15} /> {found ? "Ligar responsável" : "Adicionar responsável"}</button>
        </form>

        {inviteLink && (
          <div className="mt-4 p-3 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg">
            <div className="flex items-center gap-2 text-[#166534] text-[13px] font-medium mb-1"><CheckCircle2 size={15} /> Responsável vinculado</div>
            <p className="text-[12px] text-[#166534] mb-2">Envie este link por WhatsApp/e-mail — mostra o nome do aluno e dá acesso.</p>
            <div className="flex items-center gap-2 bg-white border border-[#BBF7D0] rounded-lg px-2 py-1.5">
              <span className="text-[11px] text-[#1F1A2E] truncate flex-1">{inviteLink}</span>
              <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="p-1 rounded text-[#5B5470] hover:text-[#166534]"><Copy size={14} /></button>
            </div>
          </div>
        )}

        <div className="border-t border-[#E9E5F5] pt-4 mt-4">
          <h3 className="text-[13px] font-semibold text-[#1F1A2E] mb-2">Código de família (cartão)</h3>
          {familyCode ? (
            <div className="flex items-center justify-between gap-2 bg-[#FAF9FD] border border-[#E9E5F5] rounded-xl px-3 py-2">
              <span className="font-mono text-[16px] tracking-widest text-[#1F1A2E]">{familyCode}</span>
              <button onClick={() => navigator.clipboard.writeText(familyCode)} className="p-1.5 rounded-lg text-[#5B5470] hover:text-[#6D28D9] hover:bg-[#EDE9FE]"><Copy size={14} /></button>
            </div>
          ) : (
            <button onClick={gerarCodigo} className="inline-flex items-center gap-2 border border-[#DDD6EE] hover:border-[#C4B5FD] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2 rounded-lg text-sm font-medium min-h-[40px]"><KeyRound size={14} /> Gerar código de família</button>
          )}
          <p className="text-[11px] text-[#5B5470] mt-2">O responsável sem e-mail usa este código + a data de nascimento do aluno em “Primeiro acesso”. Válido 120 dias, 3 ativações.</p>
        </div>
      </div>
    </div>
    {pendingDesv && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <h3 className="text-[#1F1A2E] font-bold text-base mb-2">Desvincular responsável</h3>
          <p className="text-[#5B5470] text-sm mb-3">Motivo obrigatório para fins de auditoria.</p>
          <textarea value={motivoDesv} onChange={e => setMotivoDesv(e.target.value)} placeholder="Informe o motivo…" rows={3}
            className="w-full bg-white rounded-xl px-3 py-2 text-sm border border-[#DDD6EE] focus:border-[#6D28D9] outline-none resize-none mb-4" />
          <div className="flex gap-3">
            <button onClick={() => { setPendingDesv(null); setMotivoDesv(''); }} className="flex-1 border border-[#DDD6EE] text-[#5B5470] py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Cancelar</button>
            <button onClick={desvincular} disabled={!motivoDesv.trim()} className="flex-1 bg-[#B91C1C] text-white py-2.5 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-50">Desvincular</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
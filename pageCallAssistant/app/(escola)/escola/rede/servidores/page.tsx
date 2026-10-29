"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MailPlus, Copy, RefreshCw, X, AlertCircle, CheckCircle2, Upload, UserPlus, Users,
} from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { CAN_INVITE } from "@/lib/escola/roles";
import { ROLE_LABEL } from "@/lib/escola/types";
import type { EduRole } from "@/lib/escola/types";

interface Member {
  id: string; role: EduRole; isActive: boolean;
  user: { name: string; email: string }; school: { name: string } | null;
}
interface Invite {
  id: string; email: string; name: string; role: string;
  sentCount: number; expiresAt: string; acceptedAt: string | null; createdAt: string;
}

type Tab = "ativos" | "pendentes" | "desativados";

const inputCls =
  "w-full bg-white text-[#1F1A2E] rounded-[10px] px-3 h-12 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none transition-colors";

export default function ServidoresPage() {
  const [role, setRole] = useState<EduRole | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [tab, setTab] = useState<Tab>("ativos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "", schoolId: "" });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");
  const [pendingCancel, setPendingCancel] = useState<{ type: "invite" | "member"; id: string; nome?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [meR, mR, iR, sR] = await Promise.all([
        fetch("/api/escola/auth/me"),
        fetch("/api/escola/vinculos"),
        fetch("/api/escola/convites?status=pending"),
        fetch("/api/escola/escolas"),
      ]);
      if (!mR.ok || !iR.ok) { setError(true); return; }
      const me = meR.ok ? await meR.json() : null;
      const md = await mR.json();
      const idt = await iR.json();
      const sd = sR.ok ? await sR.json() : { schools: [] };
      if (me?.role) setRole(me.role);
      setMembers(md.members ?? []);
      setInvites(idt.invites ?? []);
      setSchools(sd.schools ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allowedRoles = role ? (CAN_INVITE[role] ?? []) : [];
  const selectedRoleConfig = allowedRoles.find((r) => r.role === form.role);
  const needsSchool = selectedRoleConfig?.scope === "school";

  function openForm() {
    setFormError(""); setFormOk("");
    setForm({ name: "", email: "", role: allowedRoles[0]?.role ?? "", schoolId: "" });
    setShowForm(true);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setFormError(""); setFormOk("");
    const r = await fetch("/api/escola/convites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (!r.ok) {
      setFormError(d.results?.[0]?.error ?? d.error ?? "Erro ao enviar convite.");
      setSending(false);
      return;
    }
    setFormOk(`Convite enviado para ${form.email}. Válido por 7 dias.`);
    setForm((f) => ({ ...f, name: "", email: "" }));
    setSending(false);
    load();
  }

  async function resend(id: string) {
    await fetch(`/api/escola/convites/${id}`, { method: "POST" });
    load();
  }
  async function resendAll() {
    await Promise.all(pendentes.map((i) => fetch(`/api/escola/convites/${i.id}`, { method: "POST" })));
    load();
  }
  async function cancel(id: string) {
    setPendingCancel({ type: "invite", id });
  }
  function copyLink(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/escola/convite/${id}`);
  }
  async function toggleActive(m: Member) {
    if (m.isActive) { setPendingCancel({ type: "member", id: m.id, nome: m.user?.name ?? m.user?.email }); return; }
    await fetch(`/api/escola/vinculos/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: true }) });
    load();
  }
  async function confirmPendingCancel() {
    if (!pendingCancel) return;
    if (pendingCancel.type === "invite") {
      await fetch(`/api/escola/convites/${pendingCancel.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/escola/vinculos/${pendingCancel.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false }) });
    }
    setPendingCancel(null); load();
  }

  const ativos = members.filter((m) => m.isActive);
  const desativados = members.filter((m) => !m.isActive);
  const pendentes = invites.filter((i) => !i.acceptedAt && new Date(i.expiresAt) >= new Date());

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "ativos", label: "Com acesso", count: ativos.length },
    { key: "pendentes", label: "Convites pendentes", count: pendentes.length },
    { key: "desativados", label: "Desativados", count: desativados.length },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Servidores e convites" }]}
        title="Servidores e convites"
        subtitle="Gerencie quem tem acesso à rede e os convites enviados."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/escola/rede/importacoes?modelo=B"
              className="inline-flex items-center gap-2 border border-[#DDD6EE] hover:border-[#C4B5FD] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
            >
              <Upload size={14} /> Importar servidores
            </Link>
            {allowedRoles.length > 0 && (
              <button
                onClick={openForm}
                className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
              >
                <UserPlus size={14} /> Convidar
              </button>
            )}
          </div>
        }
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[40px] transition-colors ${
                tab === t.key
                  ? "bg-[#6D28D9] text-white"
                  : "bg-white text-[#5B5470] border border-[#E9E5F5] hover:bg-[#F5F3FF] hover:text-[#1F1A2E]"
              }`}
            >
              {t.label} <span className="opacity-70">({t.count})</span>
            </button>
          ))}
          {tab === "pendentes" && pendentes.length > 0 && (
            <button
              onClick={resendAll}
              className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6D28D9] hover:text-[#5B21B6] transition-colors min-h-[40px]"
            >
              <RefreshCw size={13} /> Reenviar todos
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : error ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} className="text-[#B91C1C]" />
            </div>
            <h2 className="text-[16px] font-bold text-[#1F1A2E] mb-1">Não foi possível carregar os servidores.</h2>
            <button onClick={load} className="mt-3 inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]">
              <RefreshCw size={15} /> Tentar de novo
            </button>
          </div>
        ) : tab === "pendentes" ? (
          pendentes.length === 0 ? (
            <EmptyState icon={<MailPlus size={26} className="text-[#6D28D9]" />} title="Nenhum convite pendente" hint="Convide servidores ou importe a planilha (Modelo B)." />
          ) : (
            <div className="space-y-2">
              {pendentes.map((inv) => (
                <div key={inv.id} className="bg-white rounded-2xl border border-[#E9E5F5] p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-[#1F1A2E]">{inv.name}</span>
                      <span className="text-[12px] text-[#6D28D9] font-medium">{ROLE_LABEL[inv.role as EduRole] ?? inv.role}</span>
                      <span className="text-[11px] text-[#5B5470]">Pendente · {inv.sentCount} envio{inv.sentCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="text-[13px] text-[#5B5470] mt-0.5">{inv.email}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <IconBtn title="Reenviar" onClick={() => resend(inv.id)}><RefreshCw size={15} /></IconBtn>
                    <IconBtn title="Copiar link" onClick={() => copyLink(inv.id)}><Copy size={15} /></IconBtn>
                    <IconBtn title="Cancelar" danger onClick={() => cancel(inv.id)}><X size={15} /></IconBtn>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          (() => {
            const list = tab === "ativos" ? ativos : desativados;
            if (list.length === 0) {
              return (
                <EmptyState
                  icon={<Users size={26} className="text-[#6D28D9]" />}
                  title={tab === "ativos" ? "Ninguém com acesso ainda" : "Ninguém desativado"}
                  hint={tab === "ativos" ? "Convide servidores ou importe a planilha (Modelo B)." : "Servidores desativados aparecem aqui."}
                />
              );
            }
            return (
              <div className="space-y-2">
                {list.map((m) => (
                  <div key={m.id} className="bg-white rounded-2xl border border-[#E9E5F5] p-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-[#1F1A2E] truncate">{m.user?.name || m.user?.email}</div>
                      <div className="text-[13px] text-[#5B5470] truncate">{m.user?.email}</div>
                      {m.school && <div className="text-[12px] text-[#5B5470]">{m.school.name}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EDE9FE] text-[#6D28D9]">{ROLE_LABEL[m.role]}</span>
                      <button
                        onClick={() => toggleActive(m)}
                        className={`text-[13px] px-2 min-h-[40px] flex items-center transition-colors ${m.isActive ? "text-[#B91C1C] hover:text-[#991B1B]" : "text-[#166534] hover:text-[#14532D]"}`}
                      >
                        {m.isActive ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Modal convidar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1A2E]/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MailPlus size={18} className="text-[#6D28D9]" />
                <h2 className="text-[15px] font-semibold text-[#1F1A2E]">Convidar servidor</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-[#5B5470] hover:text-[#1F1A2E] p-1"><X size={18} /></button>
            </div>
            <form onSubmit={sendInvite} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1F1A2E] mb-1">Papel *</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, schoolId: "" }))} className={inputCls}>
                  {allowedRoles.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                </select>
                {selectedRoleConfig && <p className="text-[12px] text-[#5B5470] mt-1">{selectedRoleConfig.description}</p>}
              </div>
              {needsSchool && (
                <div>
                  <label className="block text-[13px] font-medium text-[#1F1A2E] mb-1">Escola *</label>
                  <select value={form.schoolId} onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))} className={inputCls} required>
                    <option value="">Selecione a escola</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[13px] font-medium text-[#1F1A2E] mb-1">Nome *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} required />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1F1A2E] mb-1">E-mail *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} required />
              </div>
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg">
                  <AlertCircle size={15} className="text-[#B91C1C] mt-0.5 shrink-0" />
                  <p className="text-[13px] text-[#B91C1C]">{formError}</p>
                </div>
              )}
              {formOk && (
                <div className="flex items-start gap-2 p-3 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg">
                  <CheckCircle2 size={15} className="text-[#166534] mt-0.5 shrink-0" />
                  <p className="text-[13px] text-[#166534]">{formOk}</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] min-h-[44px]">Fechar</button>
                <button type="submit" disabled={sending} className="flex-1 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold min-h-[44px] disabled:opacity-50">{sending ? "Enviando…" : "Enviar convite"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmação */}
      {pendingCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-[#1F1A2E] font-bold text-lg mb-2">
              {pendingCancel.type === "invite" ? "Cancelar convite" : "Desativar acesso"}
            </h3>
            <p className="text-[#5B5470] text-sm mb-6">
              {pendingCancel.type === "invite"
                ? "O convite será cancelado e o link ficará inválido."
                : `Desativar o acesso de ${pendingCancel.nome ?? "este servidor"}?`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingCancel(null)} className="flex-1 border border-[#DDD6EE] text-[#5B5470] py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Cancelar</button>
              <button onClick={confirmPendingCancel} className="flex-1 bg-[#B91C1C] hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center text-[#5B5470] ${danger ? "hover:text-[#B91C1C] hover:bg-[#FEE2E2]" : "hover:text-[#6D28D9] hover:bg-[#EDE9FE]"}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E9E5F5] flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-4">{icon}</div>
      <p className="text-[#1F1A2E] text-[15px] font-semibold">{title}</p>
      <p className="text-[#5B5470] text-sm mt-1 max-w-sm">{hint}</p>
    </div>
  );
}

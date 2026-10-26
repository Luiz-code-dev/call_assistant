"use client";

import { useEffect, useState } from "react";
import { MailPlus, Copy, RefreshCw, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { CAN_INVITE } from "@/lib/escola/roles";
import { ROLE_LABEL } from "@/lib/escola/types";
import type { EduRole } from "@/lib/escola/types";

interface Invite {
  id: string;
  email: string;
  name: string;
  role: string;
  sentCount: number;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface Context {
  role: EduRole;
  networkName?: string;
}

export default function ConvitesPage() {
  const [ctx, setCtx] = useState<Context | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted">("all");
  const [form, setForm] = useState({ name: "", email: "", role: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/escola/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.role) {
          setCtx({ role: d.role, networkName: d.networkName });
          const allowed = CAN_INVITE[d.role as EduRole] ?? [];
          if (allowed.length > 0) setForm((f) => ({ ...f, role: allowed[0].role }));
        }
      });
  }, []);

  const allowedRoles = ctx ? (CAN_INVITE[ctx.role] ?? []) : [];
  const selectedRoleConfig = allowedRoles.find((r) => r.role === form.role);

  async function load() {
    const q = filter !== "all" ? `?status=${filter}` : "";
    const r = await fetch(`/api/escola/convites${q}`);
    if (r.ok) {
      const d = await r.json();
      setInvites(d.invites ?? []);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setSuccess("");
    const r = await fetch("/api/escola/convites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = d.results?.[0]?.error ?? d.error ?? "Erro ao enviar convite.";
      setError(msg);
      setSending(false);
      return;
    }
    setSuccess(`Convite enviado para ${form.email}. Válido por 7 dias.`);
    setForm((f) => ({ ...f, name: "", email: "" }));
    setSending(false);
    load();
  }

  async function resend(id: string) {
    await fetch(`/api/escola/convites/${id}`, { method: "POST" });
    load();
  }

  async function cancel(id: string) {
    if (!confirm("Cancelar este convite?")) return;
    await fetch(`/api/escola/convites/${id}`, { method: "DELETE" });
    load();
  }

  function copyLink(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/escola/convite/${id}`);
  }

  return (
    <div className="px-7 py-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-[#5B5470] mb-1">Rede · Servidores e convites</p>
        <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight">Servidores e convites</h1>
        <p className="text-[15px] text-[#5B5470] mt-1">
          Convide membros da sua rede por e-mail.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 self-start">
          <div className="flex items-center gap-2 mb-5">
            <MailPlus size={18} className="text-indigo-600" />
            <h2 className="text-[15px] font-semibold text-gray-800">Novo convite</h2>
          </div>

          {allowedRoles.length === 0 ? (
            <p className="text-[14px] text-[#5B5470]">
              Seu perfil não tem permissão para convidar membros.
            </p>
          ) : (
            <form onSubmit={sendInvite} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Papel *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[44px]"
                >
                  {allowedRoles.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {selectedRoleConfig && (
                  <p className="text-[12px] text-[#5B5470] mt-1">{selectedRoleConfig.description}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 text-sm border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[44px]"
                  required
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-red-700">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-emerald-700">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] transition-colors"
              >
                {sending ? "Enviando…" : "Enviar convite"}
              </button>
            </form>
          )}
        </div>

        {/* List */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            {(["pending", "accepted", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[40px] transition-colors ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-[#5B5470] border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Aceitos"}
              </button>
            ))}
            <span className="ml-auto text-[13px] text-[#5B5470]">
              {invites.length} convite{invites.length !== 1 ? "s" : ""}
            </span>
          </div>

          {invites.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
              <MailPlus size={32} className="text-[#3F3A4F] mb-3" />
              <p className="text-[#5B5470] text-[15px] font-medium">Nenhum convite encontrado</p>
              <p className="text-[#5B5470] text-sm mt-1">
                {filter === "pending" ? "Nenhum convite aguardando resposta." : "Sem registros para este filtro."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => {
                const expired = !inv.acceptedAt && new Date(inv.expiresAt) < new Date();
                const roleLabel = ROLE_LABEL[inv.role as EduRole] ?? inv.role;
                return (
                  <div
                    key={inv.id}
                    className={`bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3 ${
                      expired ? "border-amber-200" : "border-gray-200"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-gray-800">{inv.name}</span>
                        <span className="text-[12px] text-indigo-600 font-medium">{roleLabel}</span>
                        {inv.acceptedAt && (
                          <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Aceito</span>
                        )}
                        {!inv.acceptedAt && expired && (
                          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Expirado</span>
                        )}
                        {!inv.acceptedAt && !expired && (
                          <span className="text-[11px] text-[#5B5470]">
                            Pendente · {inv.sentCount} envio{inv.sentCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-[#5B5470] mt-0.5">{inv.email}</div>
                    </div>
                    {!inv.acceptedAt && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => resend(inv.id)}
                          title="Reenviar"
                          className="p-2 text-[#5B5470] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <RefreshCw size={15} />
                        </button>
                        <button
                          onClick={() => copyLink(inv.id)}
                          title="Copiar link"
                          className="p-2 text-[#5B5470] hover:text-[#5B5470] hover:bg-gray-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => cancel(inv.id)}
                          title="Cancelar"
                          className="p-2 text-[#5B5470] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

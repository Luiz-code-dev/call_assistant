"use client";
import { useEffect, useState } from "react";
import { ROLE_LABEL } from "@/lib/escola/types";

interface Invite {
  id: string; email: string; name: string; role: string;
  sentCount: number; expiresAt: string; acceptedAt: string | null; createdAt: string;
}

const ROLE_COLOR: Record<string, string> = {
  NETWORK_ADMIN: "text-purple-400", COORDINATOR: "text-blue-400",
  SCHOOL_ADMIN: "text-green-400", TEACHER: "text-orange-400",
};

export default function ConvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted">("all");
  const [form, setForm] = useState({ name: "", email: "", role: "TEACHER" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const q = filter !== "all" ? `?status=${filter}` : "";
    const r = await fetch(`/api/escola/convites${q}`);
    const d = await r.json();
    setInvites(d.invites ?? []);
  }
  useEffect(() => { load(); }, [filter]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setError(""); setSuccess("");
    const r = await fetch("/api/escola/convites", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error); setSending(false); return; }
    setSuccess("Convite enviado!"); setForm({ name: "", email: "", role: "TEACHER" });
    setSending(false); load();
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
    const token = invites.find(i => i.id === id)?.id ?? "";
    navigator.clipboard.writeText(`${window.location.origin}/escola/convite/${token}`);
    alert("Link copiado!");
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Convites de Servidores</h1>
      <p className="text-gray-400 text-sm mb-6">Convide gestores, coordenadores, diretores e professores por e-mail.</p>

      {/* New invite form */}
      <form onSubmit={sendInvite} className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-white font-semibold mb-4">Novo convite</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-purple-500 outline-none min-h-[44px]" required />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">E-mail *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-purple-500 outline-none min-h-[44px]" required />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Papel *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 outline-none min-h-[44px]">
              <option value="TEACHER">Professor(a)</option>
              <option value="COORDINATOR">Coordenador(a)</option>
              <option value="SCHOOL_ADMIN">Diretor(a)</option>
              <option value="NETWORK_ADMIN">Gestor de Rede</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-3">{success}</p>}
        <button type="submit" disabled={sending} className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors">
          {sending ? "Enviando..." : "Enviar convite"}
        </button>
      </form>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "pending", "accepted"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm min-h-[44px] transition-colors ${filter === f ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-500 hover:text-white"}`}>
            {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Aceitos"}
          </button>
        ))}
        <span className="ml-auto text-gray-600 text-sm flex items-center">{invites.length} convite{invites.length !== 1 ? "s" : ""}</span>
      </div>

      {invites.length === 0 ? (
        <div className="text-center py-12 text-gray-600"><div className="text-4xl mb-3">✉️</div><div>Nenhum convite encontrado.</div></div>
      ) : (
        <div className="space-y-2">
          {invites.map(inv => {
            const expired = new Date(inv.expiresAt) < new Date();
            return (
              <div key={inv.id} className={`bg-gray-900 border rounded-xl p-4 flex flex-wrap items-center gap-3 ${expired && !inv.acceptedAt ? "border-yellow-900/50" : "border-gray-800"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{inv.name}</span>
                    <span className={`text-xs font-medium ${ROLE_COLOR[inv.role] ?? "text-gray-400"}`}>{ROLE_LABEL[inv.role as keyof typeof ROLE_LABEL] ?? inv.role}</span>
                    {inv.acceptedAt && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">✓ Aceito</span>}
                    {!inv.acceptedAt && expired && <span className="text-xs text-yellow-400">Expirado</span>}
                    {!inv.acceptedAt && !expired && <span className="text-xs text-gray-500">Pendente · {inv.sentCount} envio{inv.sentCount !== 1 ? "s" : ""}</span>}
                  </div>
                  <div className="text-gray-500 text-sm">{inv.email}</div>
                </div>
                {!inv.acceptedAt && (
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <button onClick={() => resend(inv.id)} className="text-xs text-blue-400 hover:text-blue-300 min-h-[36px] px-2 transition-colors">Reenviar</button>
                    <button onClick={() => copyLink(inv.id)} className="text-xs text-gray-400 hover:text-gray-300 min-h-[36px] px-2 transition-colors">Copiar link</button>
                    <button onClick={() => cancel(inv.id)} className="text-xs text-red-400 hover:text-red-300 min-h-[36px] px-2 transition-colors">Cancelar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

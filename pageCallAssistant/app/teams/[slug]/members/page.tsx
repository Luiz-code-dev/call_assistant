"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Users, UserPlus, Mail, MoreHorizontal, Loader2, Crown, Shield, User, Trash2, X, Send } from "lucide-react";
import { toast } from "sonner";

interface OrgMember {
  id: string;
  userId: string;
  role: string;
  jobTitle: string | null;
  department: string | null;
  commScore: number;
  joinedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null; plan: string };
  teamMembers: { team: { id: string; name: string } }[];
}

interface OrgInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
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

const ROLE_ICONS: Record<string, any> = { owner: Crown, admin: Shield, member: User };
const ROLE_COLORS: Record<string, string> = {
  owner: "text-amber-400 bg-amber-400/10",
  admin: "text-violet-400 bg-violet-400/10",
  member: "text-zinc-400 bg-zinc-400/10",
};

export default function MembersPage() {
  const { slug } = useParams();
  const [orgId, setOrgId] = useState("");
  const [myRole, setMyRole] = useState("member");
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  async function load() {
    const orgsRes = await authFetch("/api/org");
    const orgs = await orgsRes.json();
    const org = Array.isArray(orgs) ? orgs.find((o: any) => o.slug === slug) : null;
    if (!org) return;
    setOrgId(org.id);
    setMyRole(org.role);

    const [membersRes, invitesRes] = await Promise.all([
      authFetch(`/api/org/${org.id}/members`),
      org.role !== "member" ? authFetch(`/api/org/${org.id}/invites`) : Promise.resolve(null),
    ]);
    setMembers(await membersRes.json());
    if (invitesRes) setInvites(await invitesRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [slug]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await authFetch(`/api/org/${orgId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao enviar convite."); return; }
      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteEmail("");
      setShowInvite(false);
      load();
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(`Remover ${name} da organização?`)) return;
    const res = await authFetch(`/api/org/${orgId}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Membro removido."); load(); }
    else toast.error("Erro ao remover membro.");
  }

  async function handleRoleChange(memberId: string, role: string) {
    const res = await authFetch(`/api/org/${orgId}/members/${memberId}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    if (res.ok) { toast.success("Função atualizada."); load(); }
    else toast.error("Erro ao atualizar função.");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
    </div>
  );

  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Membros</h1>
          <p className="text-sm text-zinc-400">{members.length} {members.length === 1 ? "membro" : "membros"} na organização</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Convidar
          </button>
        )}
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">Convidar membro</h2>
              <button onClick={() => setShowInvite(false)} className="text-zinc-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  placeholder="colaborador@empresa.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Função</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {inviting ? "Enviando..." : "Enviar convite"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {members.map(member => {
          const RoleIcon = ROLE_ICONS[member.role] ?? User;
          return (
            <div key={member.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {member.user.avatarUrl
                  ? <img src={member.user.avatarUrl} alt={member.user.name} className="w-full h-full object-cover" />
                  : <span className="text-sm font-semibold text-zinc-400">{member.user.name[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{member.user.name}</span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role]}`}>
                    <RoleIcon className="h-2.5 w-2.5" />
                    {member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Membro"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate">{member.user.email}</p>
                {(member.jobTitle || member.teamMembers.length > 0) && (
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {member.jobTitle && <span>{member.jobTitle}</span>}
                    {member.teamMembers.length > 0 && <span className="ml-2">· {member.teamMembers.map(t => t.team.name).join(", ")}</span>}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-violet-400">{member.commScore}</p>
                <p className="text-xs text-zinc-600">score</p>
              </div>
              {canManage && member.role !== "owner" && (
                <div className="flex items-center gap-1">
                  {myRole === "owner" && (
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(member.id, e.target.value)}
                      className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 focus:outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Membro</option>
                    </select>
                  )}
                  <button
                    onClick={() => handleRemove(member.id, member.user.name)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {invites.filter(i => i.status === "pending").length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Convites pendentes</h2>
          <div className="space-y-2">
            {invites.filter(i => i.status === "pending").map(invite => (
              <div key={invite.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 px-4 py-3">
                <Mail className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate">{invite.email}</p>
                  <p className="text-xs text-zinc-600">Expira em {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">Pendente</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

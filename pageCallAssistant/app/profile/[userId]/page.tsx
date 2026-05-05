"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MessageCircle, UserPlus, UserCheck, Clock,
  Grid3x3, Heart, MessageSquare, CalendarDays, BadgeCheck,
  Loader2, ImageIcon, X, Trophy, Star, Users,
} from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  plan: string;
  createdAt: string;
}

interface PostSnap {
  id: string;
  content?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  _count: { likes: number; comments: number };
}

interface FriendUser {
  id: string; name: string; username?: string | null; avatarUrl?: string | null;
}

interface Proficiency {
  level: string; cefrLevel: string; createdAt: string; overallFeedback: string;
}

interface ChallengeSnap {
  id: string;
  challenge: { title: string };
  evaluation: { fluencyScore: number; contentScore: number; clarityScore: number; cefrLevel: string };
  createdAt: string;
}

interface ProfileData {
  user: UserProfile;
  friendshipStatus: "pending" | "accepted" | null;
  isOwnProfile: boolean;
  stats: { postsCount: number; friendsCount: number };
  posts: PostSnap[];
  friends: FriendUser[] | null;
  proficiency: Proficiency | null;
  challenges: ChallengeSnap[];
}

function authHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

function Avatar({ name, avatarUrl, size = "lg" }: { name: string; avatarUrl?: string | null; size?: "sm" | "md" | "lg" | "xl" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const cls = { sm: "h-8 w-8 text-xs", md: "h-12 w-12 text-sm", lg: "h-20 w-20 text-xl", xl: "h-24 w-24 text-2xl" }[size];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${cls} rounded-full object-cover ring-4 ring-white/10 shrink-0`} />;
  return <div className={`${cls} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold shrink-0`}>{initials}</div>;
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "premium") return (
    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
      <BadgeCheck className="h-3 w-3" />Premium
    </span>
  );
  if (plan === "basic") return (
    <span className="flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
      Básico
    </span>
  );
  return null;
}

function cefrColor(level: string) {
  const map: Record<string, string> = {
    A1: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    A2: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    B1: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    B2: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    C1: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    C2: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };
  return map[level] ?? "bg-white/10 text-white border-white/20";
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostSnap | null>(null);
  const [showFriends, setShowFriends] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/profile/${userId}`, { headers: authHeaders() });
    if (!res.ok) { setError("Perfil não encontrado."); setLoading(false); return; }
    setData(await res.json());
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function addFriend() {
    setActing(true);
    const res = await fetch("/api/friends", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      toast.success("Solicitação enviada! 🎉");
      setData((d) => d ? { ...d, friendshipStatus: "pending" } : d);
    } else {
      const d = await res.json();
      toast.error(d.error === "already_exists" ? "Solicitação já existe." : "Erro ao enviar.");
    }
    setActing(false);
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "#09090b" }}>
      <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "#09090b" }}>
      <p className="text-muted-foreground">{error ?? "Erro ao carregar perfil."}</p>
      <Link href="/friends" className="text-violet-400 hover:text-violet-300 text-sm">← Voltar</Link>
    </div>
  );

  const { user, friendshipStatus, isOwnProfile, stats, posts } = data;

  return (
    <div className="min-h-screen relative overflow-x-hidden"
      style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.12) 0%, transparent 60%), #09090b" }}>

      {/* Blobs */}
      <div className="pointer-events-none fixed -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#09090b]/70 backdrop-blur-xl px-4"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">{user.username ? `@${user.username}` : user.name}</span>
          <div className="w-5" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-24">

        {/* Profile card */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-4">

          {/* Avatar + actions row */}
          <div className="flex items-start justify-between gap-4">
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="xl" />

            <div className="flex gap-2 mt-2 flex-wrap justify-end">
              {isOwnProfile ? (
                <Link href="/settings"
                  className="rounded-xl border border-white/15 bg-white/8 hover:bg-white/12 px-4 py-2 text-xs font-semibold transition-colors">
                  Editar perfil
                </Link>
              ) : (
                <>
                  {friendshipStatus === "accepted" && (
                    <Link href={`/messages/${user.id}`}
                      className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-semibold text-white transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" />Chat
                    </Link>
                  )}
                  {friendshipStatus === null && (
                    <button onClick={addFriend} disabled={acting}
                      className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60">
                      {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                      Adicionar
                    </button>
                  )}
                  {friendshipStatus === "pending" && (
                    <span className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />Pendente
                    </span>
                  )}
                  {friendshipStatus === "accepted" && (
                    <span className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400">
                      <UserCheck className="h-3.5 w-3.5" />Amigos
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Name + username + badge */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-lg leading-tight">{user.name}</h1>
              <PlanBadge plan={user.plan} />
            </div>
            {user.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
          </div>

          {/* Bio */}
          {user.bio ? (
            <p className="text-sm text-foreground/80 leading-relaxed">{user.bio}</p>
          ) : isOwnProfile ? (
            <Link href="/settings"
              className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/3 hover:bg-white/6 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span className="text-base">✏️</span>
              <span>Adicione uma bio para se apresentar — <strong className="text-violet-400">clique aqui</strong></span>
            </Link>
          ) : null}

          {/* Joined */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Membro desde {formatDate(user.createdAt)}
          </div>

          {/* Proficiency */}
          {data.proficiency && (
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cefrColor(data.proficiency.cefrLevel)}`}>
              <Star className="h-3.5 w-3.5" />
              Nível {data.proficiency.cefrLevel} — {data.proficiency.level}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 pt-1 border-t border-white/8">
            <div className="text-center">
              <p className="font-bold text-base">{stats.postsCount}</p>
              <p className="text-[11px] text-muted-foreground">Posts</p>
            </div>
            <button
              onClick={() => data.friends !== null && setShowFriends(true)}
              className={`text-center ${data.friends !== null ? "hover:opacity-70 cursor-pointer" : "cursor-default"} transition-opacity`}>
              <p className="font-bold text-base">{stats.friendsCount}</p>
              <p className="text-[11px] text-muted-foreground">Amigos</p>
            </button>
          </div>
        </div>

        {/* Challenges section */}
        {data.challenges.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Trophy className="h-4 w-4 text-amber-400" />
              <p className="font-semibold text-sm">Desafios concluídos</p>
            </div>
            <div className="space-y-2">
              {data.challenges.map((c) => {
                const avg = Math.round((c.evaluation.fluencyScore + c.evaluation.contentScore + c.evaluation.clarityScore) / 3);
                return (
                  <div key={c.id} className="rounded-xl border border-white/8 bg-white/5 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.challenge.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Fluência {c.evaluation.fluencyScore} · Conteúdo {c.evaluation.contentScore} · Clareza {c.evaluation.clarityScore}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${cefrColor(c.evaluation.cefrLevel)}`}>
                        {c.evaluation.cefrLevel}
                      </span>
                      <span className="text-sm font-bold text-amber-400">{avg}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Posts section */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Grid3x3 className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold text-sm">Posts</p>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm py-14 text-center text-muted-foreground space-y-2">
              <div className="text-3xl">📭</div>
              <p className="text-sm">{isOwnProfile ? "Você ainda não publicou nada." : "Nenhum post ainda."}</p>
              {isOwnProfile && (
                <Link href="/feed" className="inline-block mt-2 text-xs text-violet-400 hover:text-violet-300">
                  Criar primeiro post →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {posts.map((post) => (
                <button key={post.id} onClick={() => setSelectedPost(post)}
                  className="relative aspect-square rounded-xl overflow-hidden border border-white/8 bg-white/5 hover:border-violet-500/40 transition-colors group">
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <p className="text-[10px] text-muted-foreground text-center line-clamp-4 leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <span className="flex items-center gap-1 text-white text-xs font-semibold">
                      <Heart className="h-3.5 w-3.5" />{post._count.likes}
                    </span>
                    <span className="flex items-center gap-1 text-white text-xs font-semibold">
                      <MessageSquare className="h-3.5 w-3.5" />{post._count.comments}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Friends modal */}
      {showFriends && data.friends !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowFriends(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#13131a] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-400" />
                <span className="font-semibold text-sm">Amigos de {user.name.split(" ")[0]}</span>
              </div>
              <button onClick={() => setShowFriends(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {data.friends.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">Nenhum amigo ainda.</p>
              ) : (
                data.friends.map((f) => (
                  <Link key={f.id} href={`/profile/${f.id}`} onClick={() => setShowFriends(false)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                    <Avatar name={f.name} avatarUrl={f.avatarUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      {f.username && <p className="text-xs text-muted-foreground">@{f.username}</p>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post lightbox */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}>
          <div className="rounded-2xl border border-white/10 bg-[#13131a] max-w-md w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            {selectedPost.imageUrl && (
              <img src={selectedPost.imageUrl} alt="" className="w-full max-h-72 object-cover" />
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(selectedPost.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              {selectedPost.content && (
                <p className="text-sm text-foreground/90 leading-relaxed">{selectedPost.content}</p>
              )}
              <div className="flex items-center gap-4 pt-1 border-t border-white/8">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />{selectedPost._count.likes} curtidas
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-400" />{selectedPost._count.comments} comentários
                </span>
              </div>
              {!selectedPost.imageUrl && !selectedPost.content && (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 opacity-30" />
                </div>
              )}
            </div>
            <div className="px-4 pb-4">
              <Link href={`/feed`}
                className="block text-center text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Ver no Feed →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

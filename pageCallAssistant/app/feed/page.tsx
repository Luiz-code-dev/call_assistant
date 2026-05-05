"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Send, Image as ImageIcon,
  MoreHorizontal, Trash2, X, ChevronDown, Loader2, Globe,
  ArrowLeft, UserPlus, Sparkles, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────── */
interface UserSnap { id: string; name: string; username?: string | null; avatarUrl?: string | null; }
interface CommentData { id: string; content: string; createdAt: string; user: UserSnap; }
interface PostData {
  id: string; content?: string | null; imageUrl?: string | null; createdAt: string;
  likedByMe: boolean; user: UserSnap;
  _count: { likes: number; comments: number };
  comments: CommentData[];
}

/* ─── Helpers ────────────────────────────────────────────── */
function authHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/* ─── Avatar ─────────────────────────────────────────────── */
function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl?: string | null; size?: "xs" | "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const cls = { xs: "h-6 w-6 text-[9px]", sm: "h-8 w-8 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-11 w-11 text-sm" }[size];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${cls} rounded-full object-cover ring-2 ring-border shrink-0`} />;
  return <div className={`${cls} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold shrink-0`}>{initials}</div>;
}

/* ─── Create Post Card ───────────────────────────────────── */
function CreatePost({ me, onCreated }: { me: UserSnap | null; onCreated: (p: PostData) => void }) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2 MB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target?.result as string; setPreview(url); setImageUrl(url); };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!text.trim() && !imageUrl) return;
    setPosting(true);
    const res = await fetch("/api/feed", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content: text.trim(), imageUrl }),
    });
    if (res.ok) {
      const post = await res.json();
      onCreated(post);
      setText(""); setImageUrl(""); setPreview(null); setShowImageInput(false);
      toast.success("Postagem publicada!");
    } else { toast.error("Erro ao publicar."); }
    setPosting(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3">
      <div className="flex gap-3">
        {me && <Avatar name={me.name} avatarUrl={me.avatarUrl} size="md" />}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Compartilhe algo com seus amigos..."
          rows={2}
          maxLength={2000}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Image preview */}
      {preview && (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="preview" className="w-full max-h-80 object-cover" />
          <button onClick={() => { setPreview(null); setImageUrl(""); }} className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* URL image input */}
      {showImageInput && !preview && (
        <div className="flex gap-2">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Cole uma URL de imagem..."
            className="flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <button onClick={() => setShowImageInput(false)} className="text-muted-foreground hover:text-foreground px-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/30 pt-3">
        <div className="flex items-center gap-1">
          <button onClick={() => fileRef.current?.click()} title="Upload imagem"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-muted">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Foto</span>
          </button>
          <button onClick={() => setShowImageInput((v) => !v)} title="URL de imagem"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-muted">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">URL</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        <button
          onClick={submit}
          disabled={(!text.trim() && !imageUrl) || posting}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 transition-all"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Publicar
        </button>
      </div>
    </div>
  );
}

/* ─── Comment Row ────────────────────────────────────────── */
function CommentRow({ c }: { c: CommentData }) {
  return (
    <div className="flex gap-2 items-start">
      <Avatar name={c.user.name} avatarUrl={c.user.avatarUrl} size="xs" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold mr-1">{c.user.name.split(" ")[0]}</span>
        <span className="text-xs text-foreground/90">{c.content}</span>
        <span className="text-[10px] text-muted-foreground ml-2">{timeAgo(c.createdAt)}</span>
      </div>
    </div>
  );
}

/* ─── Post Card ──────────────────────────────────────────── */
function PostCard({ post, myId, onDelete }: { post: PostData; myId: string | null; onDelete: (id: string) => void }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [comments, setComments] = useState<CommentData[]>(post.comments);
  const [commentCount, setCommentCount] = useState(post._count.comments);
  const [showComments, setShowComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  async function toggleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    await fetch(`/api/feed/${post.id}/like`, { method: "POST", headers: authHeaders() });
  }

  async function loadAllComments() {
    if (loadingComments) return;
    setLoadingComments(true);
    const res = await fetch(`/api/feed/${post.id}/comments`, { headers: authHeaders() });
    if (res.ok) setComments(await res.json());
    setLoadingComments(false);
  }

  function toggleComments() {
    if (!showComments && commentCount > 3) loadAllComments();
    setShowComments((v) => !v);
  }

  async function submitComment() {
    const text = commentInput.trim();
    if (!text) return;
    setSubmittingComment(true);
    const res = await fetch(`/api/feed/${post.id}/comments`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      setCommentCount((n) => n + 1);
      setCommentInput("");
      setShowComments(true);
    }
    setSubmittingComment(false);
  }

  function share() {
    const url = `${window.location.origin}/feed#${post.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copiado!")).catch(() => toast.error("Erro ao copiar."));
  }

  async function deletePost() {
    const res = await fetch(`/api/feed/${post.id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) { onDelete(post.id); toast.success("Postagem removida."); }
    setShowMenu(false);
  }

  const isOwn = myId === post.user.id;

  return (
    <article id={post.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-lg hover:shadow-violet-500/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link href={`/profile/${post.user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar name={post.user.name} avatarUrl={post.user.avatarUrl} size="md" />
          <div>
            <p className="text-sm font-semibold leading-tight">{post.user.name}</p>
            <p className="text-[11px] text-muted-foreground">{timeAgo(post.createdAt)}</p>
          </div>
        </Link>
        {isOwn && (
          <div className="relative">
            <button onClick={() => setShowMenu((v) => !v)} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-20 rounded-xl border border-border/50 bg-card shadow-2xl py-1 min-w-[120px]">
                <button onClick={deletePost} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-muted transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Apagar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Image */}
      {post.imageUrl && (
        <div className="cursor-zoom-in" onClick={() => setImageOpen(true)}>
          <img
            src={post.imageUrl}
            alt="post"
            className="w-full max-h-[480px] object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-4">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition-all ${liked ? "text-rose-500 scale-110" : "text-muted-foreground hover:text-rose-400"}`}
        >
          <Heart className={`h-5 w-5 transition-all ${liked ? "fill-rose-500" : ""}`} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-violet-400 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
        <button onClick={share} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-400 transition-colors">
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
          {loadingComments ? (
            <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {comments.map((c) => <CommentRow key={c.id} c={c} />)}
              {commentCount > comments.length && (
                <button onClick={loadAllComments} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  <ChevronDown className="h-3 w-3" /> Ver todos os {commentCount} comentários
                </button>
              )}
            </>
          )}
          {/* Comment input */}
          <div className="flex items-center gap-2 mt-2">
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); }}}
              placeholder="Adicione um comentário..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 max-h-24"
            />
            <button
              onClick={submitComment}
              disabled={!commentInput.trim() || submittingComment}
              className="shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500 px-3 text-white disabled:opacity-40 transition-colors"
            >
              {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {imageOpen && post.imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setImageOpen(false)}>
          <button className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <img src={post.imageUrl} alt="fullscreen" className="max-h-screen max-w-full object-contain p-4" />
        </div>
      )}
    </article>
  );
}

/* ─── Sidebar ────────────────────────────────────────────── */
function Sidebar({ me }: { me: UserSnap | null }) {
  return (
    <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
      {/* Profile card */}
      {me && (
        <div className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur p-4 flex items-center gap-3">
          <Avatar name={me.name} avatarUrl={me.avatarUrl} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{me.name}</p>
            {me.username && <p className="text-xs text-muted-foreground">@{me.username}</p>}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur p-4 space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Atalhos</p>
        <Link href="/friends" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <UserPlus className="h-4 w-4 text-rose-400" /> Amigos & solicitações
        </Link>
        <Link href="/live" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <Sparkles className="h-4 w-4 text-violet-400" /> SpeakFlow Live
        </Link>
        <Link href="/network" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <TrendingUp className="h-4 w-4 text-emerald-400" /> Meu progresso
        </Link>
      </div>

      {/* Tip card */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-4 space-y-2">
        <p className="text-xs font-semibold text-violet-300">💡 Dica de hoje</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Poste uma frase em inglês no feed e peça para seus amigos corrigirem nos comentários. Aprendizado social funciona!
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground/40 px-2">SpeakFlow · speakf.com.br</p>
    </aside>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function FeedPage() {
  const [me, setMe] = useState<UserSnap | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMe(d); })
      .catch(() => {});
  }, []);

  const loadPosts = useCallback(async (cursor?: string) => {
    const url = cursor ? `/api/feed?cursor=${cursor}` : "/api/feed";
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    setPosts((prev) => cursor ? [...prev, ...data.posts] : data.posts);
    setNextCursor(data.nextCursor);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadPosts().finally(() => setLoading(false));
  }, [loadPosts]);

  useEffect(() => {
    if (!loaderRef.current || !nextCursor) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextCursor && !loadingMore) {
        setLoadingMore(true);
        loadPosts(nextCursor).finally(() => setLoadingMore(false));
      }
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [nextCursor, loadingMore, loadPosts]);

  function onPostCreated(p: PostData) { setPosts((prev) => [p, ...prev]); }
  function onPostDeleted(id: string) { setPosts((prev) => prev.filter((p) => p.id !== id)); }

  return (
    <div className="min-h-screen relative overflow-x-hidden"
      style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.15) 0%, transparent 60%), #09090b" }}>

      {/* Decorative blobs */}
      <div className="pointer-events-none fixed -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#09090b]/70 backdrop-blur-xl px-4" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/home" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-bold text-base leading-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Feed
              </h1>
              <p className="text-[11px] text-muted-foreground">Posts dos seus amigos</p>
            </div>
          </div>
          {me && <Avatar name={me.name} avatarUrl={me.avatarUrl} size="sm" />}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex gap-6 items-start">

          {/* Feed column */}
          <div className="flex-1 min-w-0 space-y-4">
            <CreatePost me={me} onCreated={onPostCreated} />

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-white/8 bg-white/4 p-4 space-y-3 animate-pulse">
                    <div className="flex gap-3 items-center">
                      <div className="h-9 w-9 rounded-full bg-white/10" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 bg-white/10 rounded w-1/3" />
                        <div className="h-2.5 bg-white/10 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-52 bg-white/10 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center text-3xl">
                  👋
                </div>
                <div>
                  <p className="font-semibold text-foreground">Nenhuma postagem ainda</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Adicione amigos para ver as postagens deles aqui, ou seja o primeiro a publicar!
                  </p>
                </div>
                <Link href="/friends" className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors">
                  <UserPlus className="h-4 w-4" /> Encontrar amigos
                </Link>
              </div>
            ) : (
              posts.map((p) => (
                <PostCard key={p.id} post={p} myId={me?.id ?? null} onDelete={onPostDeleted} />
              ))
            )}

            <div ref={loaderRef} className="py-4 flex justify-center">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Sidebar */}
          <Sidebar me={me} />
        </div>
      </main>
    </div>
  );
}

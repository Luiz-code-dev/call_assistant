"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Send, Image as ImageIcon,
  MoreHorizontal, Trash2, X, ChevronDown, Loader2, Globe,
  ArrowLeft, UserPlus, Sparkles, TrendingUp, Users,
  Clock, Compass, Check, Plus, Camera, Video, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────── */
interface UserSnap { id: string; name: string; username?: string | null; avatarUrl?: string | null; }
interface FriendSnap { id: string; friend: UserSnap; }
interface StatusData { id: string; name: string; avatarUrl?: string | null; username?: string | null; statusText?: string | null; statusEmoji?: string | null; statusExpires: string; statusMediaUrl?: string | null; }
interface SuggestionData { id: string; name: string; username?: string | null; avatarUrl?: string | null; _count: { posts: number; }; }
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
function PostCard({ post, myId, onDelete, isStranger }: { post: PostData; myId: string | null; onDelete: (id: string) => void; isStranger?: boolean }) {
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
  const [addedFriend, setAddedFriend] = useState(false);

  async function sendFriendRequest(userId: string) {
    const res = await fetch("/api/friends", {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setAddedFriend(true);
      toast.success("Solicitação enviada! 🎉");
    } else {
      const d = await res.json().catch(() => ({}));
      if (d.error === "already_exists")
        toast.info(d.status === "accepted" ? "Vocês já são amigos." : "Solicitação já enviada.");
      else
        toast.error("Erro ao enviar solicitação.");
    }
  }

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
        <div className="flex items-center gap-2">
          {isStranger && !isOwn && (
            <button
              onClick={() => sendFriendRequest(post.user.id)}
              disabled={addedFriend}
              className="flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-400 disabled:opacity-60 transition-colors"
            >
              {addedFriend ? <><Check className="h-3 w-3" /> Enviado</> : <><UserPlus className="h-3 w-3" /> Adicionar</>}
            </button>
          )}
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

/* ─── View Status Modal ──────────────────────────────────── */
function ViewStatusModal({ status, onClose }: { status: StatusData; onClose: () => void }) {
  const isVideo = status.statusMediaUrl?.startsWith("data:video") || status.statusMediaUrl?.match(/\.(mp4|webm|ogg)(\?|$)/i);
  const timeLeft = (exp: string) => {
    const h = Math.max(0, Math.floor((new Date(exp).getTime() - Date.now()) / 3600000));
    const m = Math.max(0, Math.floor(((new Date(exp).getTime() - Date.now()) % 3600000) / 60000));
    return h > 0 ? `${h}h restantes` : `${m}m restantes`;
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/90 backdrop-blur">
          <Avatar name={status.name} avatarUrl={status.avatarUrl} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{status.name}</p>
            <p className="text-[11px] text-amber-400">{timeLeft(status.statusExpires)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>
        {status.statusMediaUrl && (
          isVideo
            ? <video src={status.statusMediaUrl} autoPlay loop playsInline className="w-full max-h-72 object-cover bg-black" />
            : <img src={status.statusMediaUrl} alt="status" className="w-full max-h-72 object-cover" />
        )}
        {(status.statusText || status.statusEmoji) && (
          <div className="px-4 py-3 bg-zinc-900/90">
            <p className="text-sm leading-relaxed">
              {status.statusEmoji && <span className="mr-1.5 text-base">{status.statusEmoji}</span>}
              {status.statusText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_EMOJIS = [
  "😊","🎯","🔥","💪","📚","🎤","🚀","🏆","✅","🎉",
  "💡","⚡","🌟","🎓","💬","🌍","😴","☕","✈️","🎸",
  "🏃","🤝","💼","🌱","📝","🎵","🧠","😅","🙌","❤️",
];

/* ─── Create Status Modal ────────────────────────────────── */
function CreateStatusModal({ me, current, onClose, onSaved }: {
  me: UserSnap | null;
  current: StatusData | null;
  onClose: () => void;
  onSaved: (s: StatusData) => void;
}) {
  const [mode, setMode] = useState<"text" | "photo" | "video">("text");
  const [text, setText] = useState(current?.statusText ?? "");
  const [emoji, setEmoji] = useState(current?.statusEmoji ?? "");
  const [mediaUrl, setMediaUrl] = useState(current?.statusMediaUrl ?? "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [streamActive, setStreamActive] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 3 MB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setMediaUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: true });
      streamRef.current = stream;
      if (videoPreviewRef.current) { videoPreviewRef.current.srcObject = stream; videoPreviewRef.current.play(); }
      setStreamActive(true);
    } catch { toast.error("Não foi possível acessar a câmera."); }
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { videoBitsPerSecond: 250000 });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const reader = new FileReader();
      reader.onload = (e) => setMediaUrl(e.target?.result as string);
      reader.readAsDataURL(blob);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStreamActive(false);
    };
    mr.start(100);
    setRecording(true);
    setCountdown(10);
    let c = 10;
    timerRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) { clearInterval(timerRef.current!); mr.stop(); setRecording(false); }
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function save() {
    if (!text.trim() && !emoji.trim() && !mediaUrl)
      return toast.error("Adicione texto ou mídia ao status.");
    setSaving(true);
    const res = await fetch("/api/status", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ statusText: text || null, statusEmoji: emoji || null, statusMediaUrl: mediaUrl || null }),
    });
    if (res.ok) {
      const d = await res.json();
      const now = new Date();
      const statusData: StatusData = {
        id: me?.id ?? "", name: me?.name ?? "", avatarUrl: me?.avatarUrl,
        statusText: text || null, statusEmoji: emoji || null, statusMediaUrl: mediaUrl || null,
        statusExpires: d.statusExpires ?? new Date(now.getTime() + 86400000).toISOString(),
      };
      onSaved(statusData);
      toast.success("Status publicado por 24h! ✨");
    } else toast.error("Erro ao salvar status.");
    setSaving(false);
  }

  async function clearStatus() {
    await fetch("/api/status", { method: "POST", headers: authHeaders(), body: JSON.stringify({ clear: true }) });
    onSaved({ id: "", name: "", statusText: null, statusEmoji: null, statusMediaUrl: null, statusExpires: "" });
    toast.success("Status removido.");
  }

  const tabCls = (m: "text" | "photo" | "video") =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${mode === m ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm mx-auto sm:mx-4 rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl flex flex-col" style={{ maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
        {/* Fixed header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
          <p className="font-semibold text-sm">Novo status (24h)</p>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
        {/* Tabs */}
        <div className="flex gap-1 p-3 pb-0">
          <button className={tabCls("text")} onClick={() => setMode("text")}><Clock className="h-3.5 w-3.5" /> Texto</button>
          <button className={tabCls("photo")} onClick={() => setMode("photo")}><ImageIcon className="h-3.5 w-3.5" /> Foto</button>
          <button className={tabCls("video")} onClick={() => setMode("video")}><Video className="h-3.5 w-3.5" /> Vídeo</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Emoji picker + text */}
          <div className="flex gap-2">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="w-12 h-10 rounded-xl border border-border bg-zinc-800 flex items-center justify-center text-xl hover:bg-zinc-700 transition-colors"
              >
                {emoji || "😊"}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl p-2" style={{ width: 220 }}>
                  <div className="grid grid-cols-6 gap-1">
                    {STATUS_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                        className={`h-8 w-8 flex items-center justify-center text-lg rounded-lg transition-colors hover:bg-white/10 ${emoji === e ? "bg-violet-600/30 ring-1 ring-violet-500" : ""}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  {emoji && (
                    <button
                      type="button"
                      onClick={() => { setEmoji(""); setShowEmojiPicker(false); }}
                      className="mt-1.5 w-full text-xs text-muted-foreground hover:text-rose-400 transition-colors py-1"
                    >
                      Remover emoji
                    </button>
                  )}
                </div>
              )}
            </div>
            <input value={text} onChange={(e) => setText(e.target.value.slice(0, 150))} placeholder="O que está acontecendo?" maxLength={150}
              className="flex-1 rounded-xl border border-border bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40" />
          </div>

          {/* Photo mode */}
          {mode === "photo" && (
            <div className="space-y-2">
              <label className="flex items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-white/15 bg-white/3 hover:border-violet-500/40 hover:bg-violet-500/5 p-4 transition-colors">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Escolher foto (máx 3 MB)</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
              {mediaUrl && mediaUrl.startsWith("data:image") && (
                <div className="relative">
                  <img src={mediaUrl} alt="preview" className="w-full h-40 object-cover rounded-xl" />
                  <button onClick={() => setMediaUrl("")} className="absolute top-2 right-2 rounded-full bg-black/60 p-1"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          )}

          {/* Video mode */}
          {mode === "video" && (
            <div className="space-y-2">
              {!mediaUrl && (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video ref={videoPreviewRef} muted playsInline className="w-full h-full object-cover" />
                    {!streamActive && !recording && (
                      <button onClick={startCamera} className="absolute flex flex-col items-center gap-2 text-white">
                        <Camera className="h-10 w-10 opacity-60" />
                        <span className="text-xs opacity-60">Ativar câmera</span>
                      </button>
                    )}
                    {recording && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1">
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        <span className="text-xs text-white font-semibold">{countdown}s</span>
                      </div>
                    )}
                  </div>
                  {streamActive && !recording && (
                    <button onClick={startRecording} className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2.5 transition-colors">
                      ⏺ Gravar 10 segundos
                    </button>
                  )}
                  {recording && (
                    <button onClick={stopRecording} className="w-full rounded-xl border border-red-500 text-red-400 text-sm font-semibold py-2.5 transition-colors">
                      ⏹ Parar gravação
                    </button>
                  )}
                </div>
              )}
              {mediaUrl && (
                <div className="relative">
                  <video src={mediaUrl} controls playsInline className="w-full rounded-xl max-h-48 bg-black" />
                  <button onClick={() => setMediaUrl("")} className="absolute top-2 right-2 rounded-full bg-black/60 p-1"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving || (!text.trim() && !emoji.trim() && !mediaUrl)}
              className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold py-2.5 transition-colors">
              {saving ? "Publicando..." : "Publicar status"}
            </button>
            {current && (
              <button onClick={clearStatus} className="rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 px-4 text-sm transition-colors">
                Remover
              </button>
            )}
          </div>
        </div>
        </div>{/* end scrollable body */}
      </div>
    </div>
  );
}

/* ─── Stories Strip ──────────────────────────────────────── */
function StoriesStrip({ me }: { me: UserSnap | null }) {
  const [statuses, setStatuses] = useState<StatusData[]>([]);
  const [myStatus, setMyStatus] = useState<StatusData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<StatusData | null>(null);

  useEffect(() => {
    fetch("/api/friends/statuses", { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : []).then(setStatuses).catch(() => {});
    fetch("/api/status", { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.statusText || d?.statusMediaUrl) setMyStatus(d); })
      .catch(() => {});
  }, []);

  const hasActivity = myStatus || statuses.length > 0;

  if (!hasActivity && !me) return null;

  return (
    <>
      <div className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur overflow-hidden">
        <div className="flex gap-5 px-4 py-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {/* My story */}
          <button onClick={() => setShowCreate(true)} className="flex flex-col items-center gap-2 shrink-0 group">
            <div className={`relative rounded-full ${myStatus ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-900" : "ring-2 ring-dashed ring-white/20"} transition-all group-hover:scale-105`}>
              <Avatar name={me?.name ?? "Eu"} avatarUrl={me?.avatarUrl} size="md" />
              {!myStatus && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 border-2 border-zinc-900 text-white">
                  <Plus className="h-3 w-3" />
                </span>
              )}
              {myStatus?.statusMediaUrl && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 border-2 border-zinc-900">
                  {myStatus.statusMediaUrl.startsWith("data:video") ? <PlayCircle className="h-3 w-3 text-white" /> : <ImageIcon className="h-3 w-3 text-white" />}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground leading-none">{myStatus ? "Meu status" : "Adicionar"}</span>
          </button>

          {/* Friend stories */}
          {statuses.map((s) => (
            <button key={s.id} onClick={() => setViewing(s)} className="flex flex-col items-center gap-2 shrink-0 group">
              <div className="relative rounded-full ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-900 transition-all group-hover:scale-105">
                <Avatar name={s.name} avatarUrl={s.avatarUrl} size="md" />
                {s.statusEmoji && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-sm leading-none">{s.statusEmoji}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground leading-none max-w-[48px] truncate">{s.name.split(" ")[0]}</span>
            </button>
          ))}

          {statuses.length === 0 && !myStatus && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Seus amigos aparecerão aqui quando publicarem um status
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateStatusModal
          me={me}
          current={myStatus}
          onClose={() => setShowCreate(false)}
          onSaved={(s) => { setMyStatus(s.statusExpires ? s : null); setShowCreate(false); }}
        />
      )}
      {viewing && <ViewStatusModal status={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

/* ─── Friend Suggestions ─────────────────────────────────── */
function FriendSuggestions() {
  const [suggestions, setSuggestions] = useState<SuggestionData[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/feed/suggestions", { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : []).then(setSuggestions).catch(() => {});
  }, []);

  if (suggestions.length === 0) return null;

  async function addFriend(id: string) {
    const res = await fetch("/api/friends/request", {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ addresseeId: id }),
    });
    if (res.ok) { setSent((prev) => ({ ...prev, [id]: true })); toast.success("Solicitação enviada!"); }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <UserPlus className="h-3.5 w-3.5 text-violet-400" />
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pessoas que você pode conhecer</p>
      </div>
      <div className="pb-2">
        {suggestions.slice(0, 5).map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors">
            <Link href={`/profile/${s.id}`} className="shrink-0"><Avatar name={s.name} avatarUrl={s.avatarUrl} size="sm" /></Link>
            <Link href={`/profile/${s.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <p className="text-sm font-medium truncate">{s.name.split(" ").slice(0, 2).join(" ")}</p>
              {s.username && <p className="text-[11px] text-muted-foreground truncate">@{s.username}</p>}
            </Link>
            <button
              onClick={() => addFriend(s.id)}
              disabled={sent[s.id]}
              className="shrink-0 flex items-center gap-1 rounded-xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-400 disabled:opacity-50 transition-colors"
            >
              {sent[s.id] ? <><Check className="h-3 w-3" /> Enviado</> : <><UserPlus className="h-3 w-3" /> Adicionar</>}
            </button>
          </div>
        ))}
        <Link href="/friends" className="flex items-center gap-2 px-4 pt-1 pb-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Users className="h-3.5 w-3.5" /> Ver mais sugestões
        </Link>
      </div>
    </div>
  );
}

/* ─── Mobile Header Actions ──────────────────────────────── */
function MobileHeaderActions() {
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [me, setMe] = useState<UserSnap | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null).then((d) => { if (d) setMe(d); }).catch(() => {});

    const fetchUnread = () =>
      fetch("/api/messages/unread-per-sender", { headers: authHeaders() })
        .then((r) => r.ok ? r.json() : {})
        .then((m: Record<string, number>) => setUnreadTotal(Object.values(m).reduce((a, b) => a + b, 0)))
        .catch(() => {});
    fetchUnread();
    const id = setInterval(fetchUnread, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Link href="/friends" className="relative p-2 rounded-xl hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors">
        <MessageCircle className="h-5 w-5" />
        {unreadTotal > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        )}
      </Link>
      {me && (
        <Link href={`/profile/${me.id}`}>
          <Avatar name={me.name} avatarUrl={me.avatarUrl} size="sm" />
        </Link>
      )}
    </div>
  );
}

/* ─── Sidebar ────────────────────────────────────────────── */
function Sidebar({ me }: { me: UserSnap | null }) {
  const [friends, setFriends] = useState<FriendSnap[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/friends", { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; status: string; friend: UserSnap }>) =>
        setFriends(data.filter((f) => f.status === "accepted"))
      ).catch(() => {});

    const fetchUnread = () =>
      fetch("/api/messages/unread-per-sender", { headers: authHeaders() })
        .then((r) => r.ok ? r.json() : {})
        .then(setUnreadMap).catch(() => {});
    fetchUnread();
    const id = setInterval(fetchUnread, 10_000);
    return () => clearInterval(id);
  }, []);

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
      {/* Profile card */}
      {me && (
        <Link href={`/profile/${me.id}`} className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur p-4 flex items-center gap-3 hover:bg-white/8 transition-colors">
          <Avatar name={me.name} avatarUrl={me.avatarUrl} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{me.name}</p>
            {me.username
              ? <p className="text-xs text-muted-foreground">@{me.username}</p>
              : <p className="text-xs text-violet-400">Ver meu perfil →</p>
            }
          </div>
        </Link>
      )}

      {/* Conversas (DMs) */}
      <div className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-violet-400" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conversas</p>
          </div>
          {totalUnread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </div>
        {friends.length === 0 ? (
          <div className="px-4 pb-3">
            <Link href="/friends" className="text-xs text-muted-foreground hover:text-violet-400 transition-colors">
              + Adicionar amigos para conversar
            </Link>
          </div>
        ) : (
          <div className="pb-1">
            {friends.slice(0, 6).map((f) => {
              const unread = unreadMap[f.friend.id] ?? 0;
              return (
                <Link key={f.id} href={`/messages/${f.friend.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors relative">
                  <div className="relative shrink-0">
                    <Avatar name={f.friend.name} avatarUrl={f.friend.avatarUrl} size="sm" />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {f.friend.name.split(" ")[0]}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  )}
                </Link>
              );
            })}
            {friends.length > 6 && (
              <Link href="/friends" className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Users className="h-3.5 w-3.5" />
                Ver todos os {friends.length} amigos
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Friend suggestions */}
      <FriendSuggestions />

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
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"friends" | "discover">("friends");
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
    fetch("/api/friends", { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then((data: Array<{ status: string; friend: UserSnap }>) => {
        setFriendIds(new Set(data.filter((f) => f.status === "accepted").map((f) => f.friend.id)));
      })
      .catch(() => {});
  }, []);

  const loadPosts = useCallback(async (cursor?: string, currentTab?: string) => {
    const t = currentTab ?? "friends";
    const base = `/api/feed?tab=${t}`;
    const url = cursor ? `${base}&cursor=${cursor}` : base;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    setPosts((prev) => cursor ? [...prev, ...data.posts] : data.posts);
    setNextCursor(data.nextCursor);
  }, []);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    loadPosts(undefined, tab).finally(() => setLoading(false));
  }, [loadPosts, tab]);

  useEffect(() => {
    if (!loaderRef.current || !nextCursor) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextCursor && !loadingMore) {
        setLoadingMore(true);
        loadPosts(nextCursor, tab).finally(() => setLoadingMore(false));
      }
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [nextCursor, loadingMore, loadPosts, tab]);

  function onPostCreated(p: PostData) { setPosts((prev) => [p, ...prev]); }
  function onPostDeleted(id: string) { setPosts((prev) => prev.filter((p) => p.id !== id)); }

  return (
    <div className="min-h-screen relative overflow-x-hidden"
      style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.15) 0%, transparent 60%), #09090b" }}>

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
                SpeakFlow Social
              </h1>
              <p className="text-[11px] text-muted-foreground">Conecte, pratique e evolua</p>
            </div>
          </div>
          <MobileHeaderActions />
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-5xl flex gap-1 mt-2.5">
          <button
            onClick={() => setTab("friends")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${tab === "friends" ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
          >
            <Users className="h-3.5 w-3.5" /> Amigos
          </button>
          <button
            onClick={() => setTab("discover")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${tab === "discover" ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
          >
            <Compass className="h-3.5 w-3.5" /> Descobrir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex gap-6 items-start">

          {/* Feed column */}
          <div className="flex-1 min-w-0 space-y-4">
            <StoriesStrip me={me} />

            {tab === "friends" && <CreatePost me={me} onCreated={onPostCreated} />}

            {tab === "discover" && (
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 flex items-center gap-2.5">
                <Compass className="h-4 w-4 text-indigo-400 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Veja posts de toda a comunidade SpeakFlow. Adicione novos amigos e expanda sua rede!
                </p>
              </div>
            )}

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
                  {tab === "discover" ? "�" : "��"}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {tab === "discover" ? "Nenhum post público ainda" : "Nenhuma postagem ainda"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    {tab === "discover"
                      ? "Seja o primeiro a publicar e apareça no feed de descoberta!"
                      : "Adicione amigos para ver as postagens deles aqui, ou seja o primeiro a publicar!"}
                  </p>
                </div>
                <Link href="/friends" className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors">
                  <UserPlus className="h-4 w-4" /> Encontrar amigos
                </Link>
              </div>
            ) : (
              posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  myId={me?.id ?? null}
                  onDelete={onPostDeleted}
                  isStranger={tab === "discover" && p.user.id !== me?.id && !friendIds.has(p.user.id)}
                />
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

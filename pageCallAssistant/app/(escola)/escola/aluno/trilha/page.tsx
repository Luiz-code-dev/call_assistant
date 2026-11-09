"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, CheckCircle, ChevronRight, BookOpen, Trophy, AlertCircle } from "lucide-react";

interface Skill { id: string; code: string; shortLabel: string | null; }
interface TrackItem {
  id: string; order: number; activityId: string; estMinutes: number; done: boolean;
}
interface AtivaTrilha {
  assignmentId: string; trackId: string; title: string; subjectId: string; gradeYear: number;
  skills: Skill[]; totalItems: number; dueAt: string | null; concluidos: number;
  completedAt: string | null; lastActivityAt: string | null;
  items: TrackItem[];
}
interface ProximoPasso {
  assignmentId: string; trackId: string; title: string; subjectId: string;
  skills: Skill[]; itemId: string; activityId: string; ordem: number; total: number;
  estMinutes: number; dueAt: string | null;
}

const SUBJECT_COLOR: Record<string, string> = {
  "Inglês": "#6D28D9", "Português": "#BE185D", "Matemática": "#1D4ED8",
  "Ciências": "#0F766E", "História": "#C2410C", "Geografia": "#15803D",
  "Espanhol": "#A16207",
};
function subjectColor(id: string) { return SUBJECT_COLOR[id] ?? "#6D28D9"; }

export default function MinhaTrilhaPage() {
  const [proximoPasso, setProximoPasso] = useState<ProximoPasso | null>(null);
  const [ativas, setAtivas]             = useState<AtivaTrilha[]>([]);
  const [concluidas, setConcluidas]     = useState<AtivaTrilha[]>([]);
  const [loading, setLoading]           = useState(true);
  const [erro, setErro]                 = useState("");

  useEffect(() => {
    async function load() {
      const r = await fetch("/api/escola/aluno/trilhas").catch(() => null);
      if (!r?.ok) { setErro("Não foi possível carregar sua trilha."); setLoading(false); return; }
      const d = await r.json();
      setProximoPasso(d.proximoPasso ?? null);
      setAtivas(d.ativas ?? []);
      setConcluidas(d.concluidas ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#F8F7FC] flex items-center justify-center">
      <div className="text-[#5B5470]">Carregando sua trilha...</div>
    </div>
  );

  if (erro) return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertCircle className="text-[#B91C1C]" size={40}/>
      <p className="text-[#1F1A2E] font-medium">{erro}</p>
      <button onClick={() => location.reload()} className="text-[#6D28D9] hover:underline text-sm">Tentar de novo</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F7FC]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Próximo passo */}
        {proximoPasso ? (
          <div>
            <p className="text-xs font-semibold text-[#5B5470] mb-2 uppercase tracking-wide">Seu próximo passo</p>
            <div className="rounded-2xl p-6 space-y-4" style={{ background: "#4C1D95" }}>
              {/* Componente · trilha */}
              <p className="text-white/80 text-xs font-semibold">
                {proximoPasso.subjectId} · {proximoPasso.title}
              </p>
              {/* Habilidade */}
              {proximoPasso.skills[0] && (
                <h2 className="text-white font-extrabold text-xl leading-tight">
                  {proximoPasso.skills[0].shortLabel ?? proximoPasso.skills[0].code}
                </h2>
              )}
              {/* Meta */}
              <div className="flex items-center justify-between text-white/70 text-xs">
                <span>Atividade {proximoPasso.ordem} de {proximoPasso.total}</span>
                <span>cerca de {proximoPasso.estMinutes} min</span>
              </div>
              {/* Barra de progresso branca */}
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${((proximoPasso.ordem - 1) / proximoPasso.total) * 100}%` }}/>
              </div>
              {/* Botão Continuar */}
              <Link
                href={`/escola/aluno/atividades/${proximoPasso.activityId}?assignmentId=${proximoPasso.assignmentId}&itemId=${proximoPasso.itemId}`}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-white font-bold text-[#6D28D9] text-base min-h-[52px] hover:bg-[#EDE9FE] transition-colors">
                Continuar <ChevronRight size={18}/>
              </Link>
            </div>
          </div>
        ) : ativas.length === 0 && concluidas.length === 0 ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-8 text-center">
            {/* Ilustracao: crianca lendo com estrelas */}
            <svg viewBox="0 0 120 90" className="mx-auto mb-4 w-32 h-24" aria-hidden="true">
              <rect x="20" y="55" width="80" height="28" rx="8" fill="#EDE9FE"/>
              <rect x="30" y="62" width="25" height="4" rx="2" fill="#C4B5FD"/>
              <rect x="30" y="70" width="40" height="4" rx="2" fill="#C4B5FD"/>
              <rect x="30" y="78" width="30" height="4" rx="2" fill="#DDD6EE"/>
              <circle cx="90" cy="38" r="18" fill="#F5F3FF" stroke="#DDD6EE" strokeWidth="2"/>
              <text x="90" y="43" textAnchor="middle" fontSize="18" fill="#6D28D9">📖</text>
              <circle cx="30" cy="22" r="4" fill="#FDE68A"/>
              <circle cx="102" cy="18" r="3" fill="#FDE68A"/>
              <circle cx="15" cy="40" r="2.5" fill="#C4B5FD"/>
            </svg>
            <h2 className="text-[#1F1A2E] font-semibold">Nenhuma trilha por enquanto</h2>
            <p className="text-[#5B5470] text-sm mt-1">Faça um diagnóstico para começar sua trilha de reforço.</p>
            <Link href="/escola/aluno/painel" className="mt-4 inline-block text-[#6D28D9] hover:underline text-sm">Ver minha evolucao</Link>
          </div>
        ) : null}

        {/* Trilhas ativas */}
        {ativas.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[#1F1A2E] font-semibold text-base">Trilhas ativas</h3>
            {ativas.map(a => <TrilhaCard key={a.assignmentId} t={a}/>)}
          </div>
        )}

        {/* Trilhas concluídas */}
        {concluidas.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[#1F1A2E] font-semibold text-base flex items-center gap-2"><Trophy size={16} className="text-[#D97706]"/> Concluídas</h3>
            {concluidas.map(a => <TrilhaCard key={a.assignmentId} t={a} concluida/>)}
          </div>
        )}
      </div>
    </div>
  );
}

const STEP_LABELS = ["Relembrar", "Exemplo guiado", "Praticar", "Aplicar", "Explicar"];

/** Anel SVG de progresso */
function RingProgress({ pct, cor, concluida }: { pct: number; cor: string; concluida?: boolean }) {
  const r = 28, cx = 32, cy = 32;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E9E5F5" strokeWidth="6" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={cor} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
        transform="rotate(-90 32 32)" style={{ transition: "stroke-dasharray 0.4s ease" }} />
      {concluida
        ? <path d="M22 32l7 7 13-13" stroke={cor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        : <text x="32" y="37" textAnchor="middle" fontSize="13" fontWeight="700" fill={cor}>{pct}%</text>
      }
    </svg>
  );
}

function TrilhaCard({ t, concluida }: { t: AtivaTrilha; concluida?: boolean }) {
  const cor = subjectColor(t.subjectId);
  const pct = t.totalItems > 0 ? Math.round((t.concluidos / t.totalItems) * 100) : 0;
  const nextItem = t.items.find(i => !i.done);

  return (
    <div className="bg-white border border-[#E9E5F5] rounded-xl overflow-hidden">
      <div className="h-1" style={{ background: cor }}/>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <RingProgress pct={pct} cor={cor} concluida={concluida} />
          <div className="flex-1 min-w-0 pt-1">
            <h4 className="font-semibold text-[#1F1A2E] text-sm leading-tight truncate">{t.title}</h4>
            {t.skills[0] && <p className="text-xs text-[#5B5470] mt-0.5">{t.skills[0].shortLabel ?? t.skills[0].code}</p>}
            <p className="text-xs text-[#5B5470] mt-1">{t.concluidos} de {t.totalItems} etapas</p>
          </div>
        </div>

        {/* Escada: 5 etapas nomeadas */}
        <div className="space-y-1.5">
          {t.items.map((it, idx) => {
            const stepLabel = STEP_LABELS[idx % STEP_LABELS.length];
            const isNext = nextItem?.id === it.id;
            const isDone = it.done;
            return (
              <div key={it.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 border transition-colors
                  ${isDone ? "border-transparent" : isNext ? "border-2" : "border-[#E9E5F5]"}`}
                style={isDone ? { background: cor + "14", borderColor: cor + "30" } : isNext ? { borderColor: cor, background: cor + "08" } : { background: "#F8F7FC" }}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors`}
                  style={isDone ? { background: cor, color: "#fff" } : isNext ? { background: cor, color: "#fff" } : { background: "#E9E5F5", color: "#5B5470" }}>
                  {isDone ? <CheckCircle size={12}/> : isNext ? idx + 1 : <Lock size={10}/>}
                </div>
                <span className={`text-sm font-medium flex-1 ${isDone ? "text-[#5B5470] line-through" : isNext ? "text-[#1F1A2E] font-semibold" : "text-[#5B5470]"}`}>
                  {stepLabel}
                </span>
                {isNext && <span className="text-xs text-[#5B5470]">~{it.estMinutes} min</span>}
              </div>
            );
          })}
        </div>

        {!concluida && nextItem && (
          <Link href={`/escola/aluno/atividades/${nextItem.activityId}?assignmentId=${t.assignmentId}&itemId=${nextItem.id}`}
            className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors min-h-[48px]"
            style={{ background: cor }}>
            Continuar <ChevronRight size={14}/>
          </Link>
        )}
        {concluida && (
          <div className="flex items-center justify-center gap-2 bg-[#DCFCE7] border border-[#166534]/20 rounded-xl py-2.5 text-sm text-[#166534] font-medium">
            <Trophy size={14}/> Trilha concluida!
          </div>
        )}
      </div>
    </div>
  );
}

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
            <BookOpen className="mx-auto mb-3 text-[#DDD6EE]" size={48} strokeWidth={1.5}/>
            <h2 className="text-[#1F1A2E] font-semibold">Nenhuma trilha por enquanto</h2>
            <p className="text-[#5B5470] text-sm mt-1">Sua escola ainda não indicou uma trilha. Enquanto isso, veja sua evolução.</p>
            <Link href="/escola/aluno/painel" className="mt-4 inline-block text-[#6D28D9] hover:underline text-sm">Ver minha evolução</Link>
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

function TrilhaCard({ t, concluida }: { t: AtivaTrilha; concluida?: boolean }) {
  const cor = subjectColor(t.subjectId);
  const pct = t.totalItems > 0 ? Math.round((t.concluidos / t.totalItems) * 100) : 0;
  const nextItem = t.items.find(i => !i.done);

  return (
    <div className="bg-white border border-[#E9E5F5] rounded-xl overflow-hidden">
      <div className="h-1" style={{ background: cor }}/>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[#1F1A2E] text-sm leading-tight truncate">{t.title}</h4>
            {t.skills[0] && <p className="text-xs text-[#5B5470] mt-0.5">{t.skills[0].shortLabel ?? t.skills[0].code}</p>}
          </div>
          {concluida && <CheckCircle size={18} className="text-[#16A34A] shrink-0"/>}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-[#5B5470] mb-1">
            <span>{t.concluidos} de {t.totalItems} atividades</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-[#F8F7FC] rounded-full overflow-hidden border border-[#E9E5F5]">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }}/>
          </div>
        </div>

        {/* Lista de itens */}
        <div className="flex gap-1.5 flex-wrap">
          {t.items.map((it, idx) => (
            <span key={it.id} title={`Atividade ${idx+1}`}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                ${it.done ? "text-white" : nextItem?.id === it.id ? "border-2 text-[#1F1A2E]" : "bg-[#F8F7FC] border border-[#E9E5F5] text-[#5B5470]"}`}
              style={it.done ? { background: cor } : nextItem?.id === it.id ? { borderColor: cor, color: cor } : {}}>
              {it.done ? <CheckCircle size={12}/> : nextItem?.id !== it.id ? <Lock size={10}/> : idx+1}
            </span>
          ))}
        </div>

        {!concluida && nextItem && (
          <Link href={`/escola/aluno/atividades/${nextItem.activityId}?assignmentId=${t.assignmentId}&itemId=${nextItem.id}`}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors min-h-[44px]"
            style={{ background: cor }}>
            Continuar <ChevronRight size={14}/>
          </Link>
        )}
        {concluida && (
          <div className="flex items-center justify-center gap-2 bg-[#DCFCE7] border border-[#166534]/20 rounded-xl py-2.5 text-sm text-[#166534] font-medium">
            <Trophy size={14}/> Trilha concluída!
          </div>
        )}
      </div>
    </div>
  );
}

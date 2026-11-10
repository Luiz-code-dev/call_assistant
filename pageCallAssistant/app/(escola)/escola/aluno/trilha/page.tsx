"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Check, Play, Trophy, AlertCircle, Clock, Lightbulb, Eye, PenLine, Target, MessageCircle } from "lucide-react";
import { Capa, Conteudo, NavAluno, CARTAO, BOTAO, FUNDO, Carregando, IconeMateria, materiaDe } from "@/components/escola/reforco-ui";

interface Skill { id: string; code: string; shortLabel: string | null; }
interface TrackItem {
  id: string; order: number; activityId: string; estMinutes: number; done: boolean;
}
interface AtivaTrilha {
  assignmentId: string; trackId: string; title: string; subjectId: string | null; subjectCode?: string | null; gradeYear: number;
  skills: Skill[]; totalItems: number; dueAt: string | null; concluidos: number;
  completedAt: string | null; lastActivityAt: string | null;
  items: TrackItem[];
}
interface ProximoPasso {
  assignmentId: string; trackId: string; title: string; subjectId: string | null; subjectCode?: string | null;
  skills: Skill[]; itemId: string; activityId: string; ordem: number; total: number;
  estMinutes: number; dueAt: string | null;
}

const ETAPAS = [
  { nome: "Relembrar", Icone: Lightbulb },
  { nome: "Exemplo guiado", Icone: Eye },
  { nome: "Praticar", Icone: PenLine },
  { nome: "Aplicar", Icone: Target },
  { nome: "Explicar", Icone: MessageCircle },
];

function corDe(t: { subjectCode?: string | null; subjectId: string | null }) {
  return materiaDe(t.subjectCode ?? t.subjectId)?.cor ?? "#6D28D9";
}
function nomeMateria(t: { subjectCode?: string | null; subjectId: string | null }) {
  return materiaDe(t.subjectCode ?? t.subjectId)?.nome ?? "";
}
/** Agrupa por matéria; a matéria da trilha mexida por último vem primeiro */
function porMateria(lista: AtivaTrilha[]): { codigo: string; trilhas: AtivaTrilha[] }[] {
  const grupos = new Map<string, AtivaTrilha[]>();
  for (const t of lista) {
    const codigo = t.subjectCode ?? t.subjectId ?? "";
    grupos.set(codigo, [...(grupos.get(codigo) ?? []), t]);
  }
  const recente = (t: AtivaTrilha) => (t.lastActivityAt ? +new Date(t.lastActivityAt) : 0);
  return Array.from(grupos.entries())
    .map(([codigo, trilhas]) => ({ codigo, trilhas: [...trilhas].sort((x, y) => recente(y) - recente(x)) }))
    .sort((x, y) => recente(y.trilhas[0]) - recente(x.trilhas[0]) || (materiaDe(x.codigo)?.nome ?? "").localeCompare(materiaDe(y.codigo)?.nome ?? ""));
}

function linkAtividade(activityId: string, assignmentId: string, itemId: string) {
  return `/escola/aluno/atividades/${activityId}?assignmentId=${assignmentId}&itemId=${itemId}`;
}

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

  if (loading) return <Carregando texto="Carregando sua trilha..." />;

  if (erro) return (
    <div className={`${FUNDO} flex flex-col items-center justify-center gap-3 p-6 text-center`}>
      <AlertCircle className="text-[#B91C1C]" size={40}/>
      <p className="text-[#1F1A2E] font-semibold">{erro}</p>
      <button onClick={() => location.reload()} className={BOTAO}>Tentar de novo</button>
    </div>
  );

  const vazio = !proximoPasso && ativas.length === 0 && concluidas.length === 0;
  const corCapa = proximoPasso ? corDe(proximoPasso) : undefined;

  return (
    <div className={FUNDO}>
      <Capa titulo="Minha trilha" subtitulo="Cinco etapas curtas para firmar cada conteúdo."
        voltar={{ href: "/escola/aluno", texto: "Início" }} cor={corCapa} />

      <Conteudo>
        {/* Próximo passo */}
        {proximoPasso && (
          <section className={`${CARTAO} p-5 space-y-4`}>
            <div className="flex items-center gap-3">
              <IconeMateria chave={proximoPasso.subjectCode ?? proximoPasso.subjectId} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: corDe(proximoPasso) }}>
                  Seu próximo passo{nomeMateria(proximoPasso) ? ` · ${nomeMateria(proximoPasso)}` : ""}
                </p>
                <h2 className="text-lg font-extrabold text-[#1F1A2E] leading-snug">{proximoPasso.title}</h2>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[#5B5470] font-medium">
              <span>{ETAPAS[(proximoPasso.ordem - 1) % ETAPAS.length]?.nome} · etapa {proximoPasso.ordem} de {proximoPasso.total}</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />cerca de {proximoPasso.estMinutes} min</span>
            </div>
            <div className="h-2.5 bg-[#F3F0FB] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${((proximoPasso.ordem - 1) / proximoPasso.total) * 100}%`, background: corDe(proximoPasso) }}/>
            </div>
            <Link href={linkAtividade(proximoPasso.activityId, proximoPasso.assignmentId, proximoPasso.itemId)}
              className={`${BOTAO} w-full text-base`} style={{ background: corDe(proximoPasso) }}>
              <Play className="size-4 fill-current" /> Continuar
            </Link>
          </section>
        )}

        {vazio && (
          <section className={`${CARTAO} p-8 text-center`}>
            <svg viewBox="0 0 120 90" className="mx-auto mb-4 w-32 h-24" aria-hidden="true">
              <rect x="20" y="62" width="80" height="14" rx="4" fill="#FDE68A"/>
              <rect x="26" y="48" width="70" height="14" rx="4" fill="#F9A8D4"/>
              <rect x="18" y="34" width="76" height="14" rx="4" fill="#A7F3D0"/>
              <path d="M98 14 l3 7 7 1 -5 5 1.5 7 -6.5 -3.5 -6.5 3.5 1.5 -7 -5 -5 7 -1z" fill="#C4B5FD"/>
              <circle cx="16" cy="18" r="4" fill="#FDE68A"/>
            </svg>
            <h2 className="text-[#1F1A2E] font-extrabold text-lg">Nenhuma trilha por enquanto</h2>
            <p className="text-[#5B5470] text-sm mt-1">Escolha uma matéria e faça o diagnóstico. A sua trilha aparece logo depois.</p>
            <Link href="/escola/aluno" className={`${BOTAO} mt-5`}>Escolher uma matéria</Link>
          </section>
        )}

        {/* Trilhas em andamento, separadas por matéria */}
        {porMateria(ativas).map(({ codigo, trilhas }) => {
          const m = materiaDe(codigo);
          return (
            <section key={codigo} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <IconeMateria chave={codigo} tamanho={32} />
                <h3 className="text-lg font-extrabold text-[#1F1A2E] flex-1">{m?.nome ?? "Outras trilhas"}</h3>
                <span className="text-[12px] font-bold rounded-full px-2.5 py-1" style={{ background: (m?.cor ?? "#6D28D9") + "18", color: m?.cor ?? "#6D28D9" }}>
                  {trilhas.length} {trilhas.length === 1 ? "trilha" : "trilhas"}
                </span>
              </div>
              {trilhas.map(a => <TrilhaCard key={a.assignmentId} t={a}/>)}
            </section>
          );
        })}

        {/* Trilhas concluídas */}
        {concluidas.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-extrabold text-[#1F1A2E] px-1 flex items-center gap-2"><Trophy size={18} className="text-[#D97706]"/> Concluídas</h3>
            {concluidas.map(a => <TrilhaCard key={a.assignmentId} t={a} concluida/>)}
          </section>
        )}
      </Conteudo>
      <NavAluno ativo="trilha" />
    </div>
  );
}

function TrilhaCard({ t, concluida }: { t: AtivaTrilha; concluida?: boolean }) {
  const cor = corDe(t);
  const nextItem = t.items.find(i => !i.done);

  return (
    <div className={`${CARTAO} p-4 space-y-4`}>
      <div className="flex items-center gap-3">
        <IconeMateria chave={t.subjectCode ?? t.subjectId} tamanho={44} />
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-[#1F1A2E] leading-tight">{t.title}</h4>
          <p className="text-xs text-[#5B5470] mt-0.5">
            {nomeMateria(t) ? `${nomeMateria(t)} · ` : ""}{t.concluidos} de {t.totalItems} etapas
          </p>
        </div>
      </div>

      {/* Caminho das 5 etapas */}
      <ol className="relative space-y-2">
        <span className="absolute left-[19px] top-5 bottom-5 w-0.5 bg-[#EDE9F7]" aria-hidden="true" />
        {t.items.map((it, idx) => {
          const etapa = ETAPAS[idx % ETAPAS.length];
          const isNext = !concluida && nextItem?.id === it.id;
          const isDone = it.done;
          const conteudo = (
            <>
              <span className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={isDone ? { background: cor, color: "#fff" } : isNext ? { background: "#fff", color: cor, boxShadow: `0 0 0 3px ${cor}` } : { background: "#F3F0FB", color: "#A59FB8" }}>
                {isDone ? <Check className="size-5" strokeWidth={3} /> : isNext ? <etapa.Icone className="size-5" /> : <Lock className="size-4" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-sm ${isNext ? "font-extrabold text-[#1F1A2E]" : isDone ? "font-semibold text-[#5B5470]" : "font-medium text-[#8B84A0]"}`}>{etapa.nome}</span>
                {isNext && <span className="block text-xs text-[#5B5470]">Agora · cerca de {it.estMinutes} min</span>}
                {isDone && <span className="block text-xs" style={{ color: cor }}>Feita</span>}
              </span>
              {isNext && <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: cor }}><Play className="size-4 fill-current" /></span>}
            </>
          );
          return (
            <li key={it.id}>
              {isNext ? (
                <Link href={linkAtividade(it.activityId, t.assignmentId, it.id)}
                  className="flex items-center gap-3 rounded-2xl p-2 pr-3 active:scale-[0.99] transition-transform" style={{ background: cor + "12" }}>
                  {conteudo}
                </Link>
              ) : (
                <div className="flex items-center gap-3 p-2 pr-3">{conteudo}</div>
              )}
            </li>
          );
        })}
      </ol>

      {concluida && (
        <div className="flex items-center justify-center gap-2 bg-[#DCFCE7] rounded-2xl py-3 text-sm text-[#166534] font-bold">
          <Trophy size={16}/> Trilha concluída!
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Mic, PenLine, HelpCircle, Clock, CheckCircle2, ChevronRight, LogOut, FlaskConical,
  AlertCircle, RefreshCw, BookA, Calculator, Landmark, Globe, Palette, Dumbbell, Languages, HeartHandshake,
  Flame, Route, Play,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavAluno } from "@/components/escola/reforco-ui";
import { RecadoDaFamilia, AgendaDeHoje, AtivarAvisos } from "@/components/escola/aluno/RecadosAluno";
import FlowBoasVindas from "@/components/escola/aluno/FlowBoasVindas";
import MissoesDoDia from "@/components/escola/aluno/MissoesDoDia";

interface Subject { id: string; name: string; color: string | null }
interface Submission { id: string; status: string; evaluatedAt: string | null; masteryLevel: string | null }
interface Atividade {
  id: string; title: string; type: "WRITTEN" | "SPOKEN" | "QUIZ";
  subject: Subject | null; dueAt: string | null; isDone: boolean;
  isExpired: boolean; canRetry: boolean; maxAttempts: number; attemptsUsed: number;
  submission: Submission | null;
}
interface Materia {
  codigo: string; nome: string; cor: string;
  diagnosticoId: string | null;
  estado: "disponivel" | "em_trilha" | "feito" | "sem_diagnostico";
  trilhaAtual: string | null;
}

const TYPE_ICON = { WRITTEN: PenLine, SPOKEN: Mic, QUIZ: HelpCircle };
const TYPE_LABEL = { WRITTEN: "Escrita", SPOKEN: "Fala", QUIZ: "Quiz" };
const TYPE_COLOR = { WRITTEN: "bg-[#EDE9FE] text-[#6D28D9]", SPOKEN: "bg-[#EDE9FE] text-[#6D28D9]", QUIZ: "bg-[#FEF3C7] text-[#92400E]" };
const DIAS_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"];

// Um ícone por matéria, sem repetir
const ICONES_MATERIA: Record<string, LucideIcon> = {
  LP: BookA, MA: Calculator, CI: FlaskConical, HI: Landmark,
  GE: Globe, AR: Palette, EF: Dumbbell, LI: Languages, ER: HeartHandshake,
};

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? "";
}

/** Ilustração da capa (original, só formas) */
function IlustracaoCapa() {
  return (
    <svg viewBox="0 0 140 120" className="w-[124px] h-[106px]" aria-hidden="true">
      <circle cx="70" cy="62" r="50" fill="#FFFFFF" opacity="0.12" />
      {/* livros */}
      <rect x="30" y="86" width="80" height="14" rx="4" fill="#FDE68A" />
      <rect x="36" y="72" width="70" height="14" rx="4" fill="#F9A8D4" />
      <rect x="28" y="58" width="76" height="14" rx="4" fill="#A7F3D0" />
      <rect x="40" y="89" width="40" height="3" rx="1.5" fill="#F59E0B" opacity="0.6" />
      <rect x="44" y="75" width="36" height="3" rx="1.5" fill="#EC4899" opacity="0.5" />
      <rect x="36" y="61" width="44" height="3" rx="1.5" fill="#10B981" opacity="0.5" />
      {/* lápis */}
      <g transform="rotate(-35 98 40)">
        <rect x="84" y="34" width="34" height="10" rx="2" fill="#FBBF24" />
        <rect x="84" y="34" width="7" height="10" rx="2" fill="#F472B6" />
        <path d="M118 34 L128 39 L118 44 Z" fill="#FDE68A" />
        <path d="M124.5 37.3 L128 39 L124.5 40.7 Z" fill="#1F1A2E" />
      </g>
      {/* estrelas */}
      <path d="M26 30 l3 7 7 1 -5 5 1.5 7 -6.5 -3.5 -6.5 3.5 1.5 -7 -5 -5 7 -1z" fill="#FDE68A" />
      <circle cx="118" cy="16" r="4" fill="#FFFFFF" opacity="0.7" />
      <circle cx="12" cy="70" r="3" fill="#FFFFFF" opacity="0.5" />
    </svg>
  );
}

function MasteryBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const m: Record<string, { label: string; cls: string }> = {
    MASTERED: { label: "Domina",    cls: "bg-[#DCFCE7] text-[#166534]" },
    ALMOST:   { label: "Quase lá",  cls: "bg-[#FEF3C7] text-[#92400E]" },
    NOT_YET:  { label: "Ainda não", cls: "bg-[#FEE2E2] text-[#B91C1C]" },
  };
  const info = m[level];
  if (!info) return null;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>;
}

function StatusBadge({ sub }: { sub: Submission | null }) {
  if (!sub) return null;
  if (sub.status === "IN_PROGRESS") return <span className="text-xs text-[#5B5470]">Rascunho</span>;
  if (sub.status === "SUBMITTED") return <span className="text-xs text-[#92400E] flex items-center gap-1"><Clock className="size-3" />Analisando...</span>;
  if (sub.masteryLevel) return <MasteryBadge level={sub.masteryLevel} />;
  return <span className="text-xs text-[#166534] flex items-center gap-1"><CheckCircle2 className="size-3" />Corrigido</span>;
}

export default function AlunoHomePage() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [materiasLoading, setMateriasLoading] = useState(true);
  const [materiasErro, setMateriasErro] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [classInfo, setClassInfo] = useState("");
  const [diasSemana, setDiasSemana] = useState<boolean[]>([false,false,false,false,false,false,false]);
  const [diasSeguidos, setDiasSeguidos] = useState(0);
  const [hojeIndex, setHojeIndex] = useState(0);
  const [materias, setMaterias] = useState<Materia[]>([]);

  const loadMaterias = useCallback(async () => {
    setMateriasLoading(true);
    setMateriasErro(false);
    try {
      const res = await fetch("/api/escola/aluno/materias");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[materias]", res.status, body);
        setMateriasErro(true);
        return;
      }
      const data = await res.json();
      setMaterias(data.materias ?? []);
    } catch (err) {
      console.error("[materias]", err);
      setMateriasErro(true);
    } finally {
      setMateriasLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [resAtvs, resPerfil, resTrilhas] = await Promise.all([
        fetch("/api/escola/aluno/atividades?filter=todo"),
        fetch("/api/escola/aluno/perfil"),
        fetch("/api/escola/aluno/trilhas"),
      ]);

      if (resAtvs.status === 401) { window.location.href = "/escola/aluno/entrar"; return; }
      const data = await resAtvs.json();
      setAtividades(data.atividades ?? []);

      if (resPerfil.ok) {
        const p = await resPerfil.json();
        setStudentName(p.fullName ?? "");
        setClassInfo(p.className ?? "");
      }

      if (resTrilhas.ok) {
        const t = await resTrilhas.json();
        const semana = t.semana;
        if (semana) {
          setDiasSemana(semana.dias ?? []);
          setHojeIndex(semana.hojeIndex ?? 0);
          const dias: boolean[] = semana.dias ?? [];
          let seguidos = 0;
          for (let i = (semana.hojeIndex ?? 0); i >= 0; i--) {
            if (dias[i]) seguidos++; else break;
          }
          setDiasSeguidos(seguidos);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadMaterias();
  }, [load, loadMaterias]);

  useEffect(() => {
    const hasProcessing = atividades.some((a) => a.submission?.status === "SUBMITTED");
    if (!hasProcessing) return;
    const timer = setTimeout(load, 5000);
    return () => clearTimeout(timer);
  }, [atividades, load]);

  const paraFazer = atividades.filter((a) => !a.isDone && !a.isExpired);
  const ultimoRetorno = atividades.find((a) => a.isDone && a.submission?.evaluatedAt);
  const temTrilha = materias.some((m) => m.estado === "em_trilha");

  const emTrilha = materias.find((m) => m.estado === "em_trilha") ?? null;
  const nome = primeiroNome(studentName);

  return (
    <div className="min-h-screen bg-[#F6F4FE] pb-28">
      {/* Capa */}
      <header className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-[#5B21B6] via-[#6D28D9] to-[#8B5CF6] text-white">
        <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute top-24 -left-12 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative max-w-3xl mx-auto px-5 pt-5 pb-20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold bg-white/15 rounded-full px-3 py-1">{classInfo || "Reforço escolar"}</span>
            <form action="/api/escola/aluno/sair" method="POST">
              <button type="submit" title="Sair"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="pb-2">
              <h1 className="text-[28px] font-extrabold leading-tight">{nome ? `Oi, ${nome}!` : "Oi!"}</h1>
              <p className="text-sm text-white/85 mt-1 max-w-[220px]">Escolha uma matéria e pratique no seu ritmo.</p>
            </div>
            <IlustracaoCapa />
          </div>
        </div>
      </header>

      <main className="relative max-w-3xl mx-auto px-4 -mt-14 space-y-6">
        {/* Flow, o mascote: cumprimenta e aponta o próximo passo */}
        <FlowBoasVindas nome={nome} estudouHoje={!!diasSemana[hojeIndex]} diasSeguidos={diasSeguidos}
          materias={materias} carregando={loading || materiasLoading} />

        {/* Missões de hoje: etapa da matéria fraca, revisão de 2 minutos, horário da família */}
        <MissoesDoDia />

        {/* Semana */}
        <section className="bg-white rounded-3xl p-4 shadow-[0_8px_24px_rgba(91,33,182,0.12)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[#1F1A2E]">Sua semana</p>
            <span className={`flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1 ${diasSeguidos > 0 ? "bg-[#FFEDD5] text-[#C2410C]" : "bg-[#F3F0FB] text-[#5B5470]"}`}>
              <Flame className="size-3.5" />
              {diasSeguidos > 0 ? `${diasSeguidos} ${diasSeguidos === 1 ? "dia" : "dias"} seguidos` : "Comece hoje"}
            </span>
          </div>
          <div className="flex justify-between">
            {DIAS_SEMANA.map((d, i) => {
              const isHoje = i === hojeIndex;
              const praticou = diasSemana[i] ?? false;
              return (
                <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                  praticou ? "bg-gradient-to-br from-[#F97316] to-[#FB923C] text-white"
                    : isHoje ? "bg-white text-[#6D28D9] ring-2 ring-[#6D28D9]"
                    : "bg-[#F3F0FB] text-[#8B84A0]"
                }`}>
                  {praticou ? <CheckCircle2 className="size-4" /> : d}
                </div>
              );
            })}
          </div>
        </section>

        {/* Recado da família e horário de hoje */}
        <RecadoDaFamilia />
        <AgendaDeHoje />
        <AtivarAvisos />

        {/* Continuar */}
        {emTrilha && (
          <Link href="/escola/aluno/trilha"
            className="flex items-center gap-4 rounded-3xl p-4 text-white shadow-md active:scale-[0.99] transition-transform"
            style={{ background: `linear-gradient(135deg, ${emTrilha.cor}, ${emTrilha.cor}CC)` }}>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              {(() => { const I = ICONES_MATERIA[emTrilha.codigo] ?? Route; return <I className="size-6" />; })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Continue de onde parou</p>
              <p className="font-bold leading-snug line-clamp-2">{emTrilha.trilhaAtual ?? emTrilha.nome}</p>
              <p className="text-xs text-white/80">{emTrilha.nome}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0" style={{ color: emTrilha.cor }}>
              <Play className="size-4 fill-current" />
            </div>
          </Link>
        )}

        {/* Matérias */}
        <section id="materias" className="scroll-mt-4">
          <h2 className="text-lg font-extrabold text-[#1F1A2E] mb-3 px-1">Suas matérias</h2>

          {materiasLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-36 rounded-3xl animate-pulse bg-[#E9E5F5]" />)}
            </div>
          ) : materiasErro ? (
            <div className="rounded-3xl bg-white p-6 text-center">
              <AlertCircle className="size-8 text-[#B91C1C] mx-auto mb-2" />
              <p className="font-semibold text-[#1F1A2E] text-sm">Não foi possível carregar as matérias.</p>
              <p className="text-xs text-[#5B5470] mt-1 mb-4">Verifique sua conexão e tente de novo.</p>
              <button onClick={loadMaterias}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6D28D9] text-white text-sm font-semibold hover:bg-[#5B21B6] transition-colors min-h-[44px]">
                <RefreshCw className="size-4" />
                Tentar de novo
              </button>
            </div>
          ) : materias.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-center">
              <FlaskConical className="size-8 text-[#5B5470] mx-auto mb-2" />
              <p className="font-semibold text-[#1F1A2E] text-sm">Nenhuma matéria disponível ainda.</p>
              <p className="text-xs text-[#5B5470] mt-1">As matérias do seu ano aparecerão aqui em breve.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {materias.map((m) => {
                // Em trilha: vai para a trilha. Diagnóstico feito sem trilha (domina tudo ou
                // trilha encerrada): vai para a evolução, nunca para uma trilha vazia.
                const href = m.diagnosticoId
                  ? `/escola/aluno/diagnostico/${m.diagnosticoId}`
                  : m.estado === "em_trilha" ? "/escola/aluno/trilha" : "/escola/aluno/evolucao";
                const isEmTrilha = m.estado === "em_trilha";
                const isFeito = m.estado === "feito";
                const Icone = ICONES_MATERIA[m.codigo] ?? FlaskConical;
                const acao = isEmTrilha ? "Continuar" : isFeito ? "Ver evolução" : "Começar";
                return (
                  <Link key={m.codigo} href={href}
                    className="relative overflow-hidden flex flex-col justify-between rounded-3xl p-4 min-h-[148px] active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: m.cor + "17" }}>
                    <Icone className="absolute -right-4 -bottom-4 size-24 opacity-[0.08]" strokeWidth={1.5} />
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${m.cor}, ${m.cor}D9)` }}>
                      <Icone className="size-6" strokeWidth={2.2} />
                    </div>
                    <div className="relative mt-3">
                      <p className="text-[15px] font-extrabold text-[#1F1A2E] leading-tight">{m.nome}</p>
                      <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold rounded-full bg-white px-2.5 py-1"
                        style={{ color: m.cor }}>
                        {isFeito && !isEmTrilha ? <CheckCircle2 className="size-3" /> : <Play className="size-3 fill-current" />}
                        {acao}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Último retorno de atividade escolar */}
        {ultimoRetorno && (
          <section>
            <h2 className="text-lg font-extrabold text-[#1F1A2E] mb-3 px-1">Último retorno</h2>
            <Link href={`/escola/aluno/atividades/${ultimoRetorno.id}/retorno`}
              className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm">
              <div className={`rounded-2xl p-2.5 ${TYPE_COLOR[ultimoRetorno.type]}`}>
                {(() => { const Icon = TYPE_ICON[ultimoRetorno.type]; return <Icon className="size-5" />; })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1F1A2E] truncate">{ultimoRetorno.title}</p>
                <p className="text-xs text-[#5B5470]">{ultimoRetorno.subject?.name}</p>
              </div>
              <StatusBadge sub={ultimoRetorno.submission} />
              <ChevronRight className="size-4 text-[#5B5470] shrink-0" />
            </Link>
          </section>
        )}

        {/* Atividades da turma ("Para fazer") — só aparece se houver atividades ou trilha */}
        {(paraFazer.length > 0 || (temTrilha && !loading)) && (
          <section>
            <h2 className="text-lg font-extrabold text-[#1F1A2E] mb-3 px-1">Para fazer</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-20 rounded-3xl animate-pulse bg-[#E9E5F5]" />)}
              </div>
            ) : paraFazer.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 text-center">
                <CheckCircle2 className="size-8 text-[#166534] mx-auto mb-2" />
                <p className="font-semibold text-[#1F1A2E] text-sm">Tudo em dia!</p>
                {materias.length > 0 && <p className="text-xs text-[#5B5470] mt-1">Que tal praticar mais uma matéria?</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {paraFazer.map((a) => {
                  const Icon = TYPE_ICON[a.type];
                  const due = a.dueAt ? new Date(a.dueAt) : null;
                  const isUrgent = due && due.getTime() - Date.now() < 24 * 60 * 60 * 1000;
                  const subjectColor = a.subject?.color ?? "#6D28D9";
                  return (
                    <Link key={a.id} href={`/escola/aluno/atividades/${a.id}`}
                      className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm active:scale-[0.99] transition-transform">
                      <div className="rounded-2xl p-2.5 shrink-0" style={{ background: subjectColor + "18", color: subjectColor }}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[a.type]}`}>{TYPE_LABEL[a.type]}</span>
                          {a.subject && <span className="text-[10px] text-[#5B5470] truncate">{a.subject.name}</span>}
                        </div>
                        <p className="font-semibold text-[#1F1A2E] truncate mt-0.5">{a.title}</p>
                        {due && (
                          <p className={`text-xs mt-0.5 flex items-center gap-1 ${isUrgent ? "text-[#B91C1C]" : "text-[#5B5470]"}`}>
                            <Clock className="size-3" />
                            {isUrgent ? "Prazo hoje" : `Até ${due.toLocaleDateString("pt-BR")}`}
                          </p>
                        )}
                        {a.submission?.status === "IN_PROGRESS" && <p className="text-xs text-[#5B5470] mt-0.5">Rascunho salvo</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge sub={a.submission} />
                        <ChevronRight className="size-4 text-[#5B5470]" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <NavAluno ativo="inicio" />
    </div>
  );
}

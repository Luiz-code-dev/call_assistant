"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Mic, PenLine, HelpCircle, Clock, CheckCircle2, ChevronRight, BookOpen, TrendingUp, LogOut, ClipboardList, FlaskConical, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";

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

const ICONES_MATERIA: Record<string, React.ComponentType<{ className?: string }>> = {
  LP: Mic, MA: HelpCircle, CI: FlaskConical, HI: BookOpen,
  GE: TrendingUp, AR: PenLine, EF: TrendingUp, LI: Mic, ER: BookOpen,
};

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

  return (
    <div className="min-h-screen bg-[#F8F7FC]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#E9E5F5] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#5B5470]">{classInfo}</p>
            <h1 className="text-base font-semibold text-[#1F1A2E]">{studentName || "Portal do Aluno"}</h1>
          </div>
          <form action="/api/escola/aluno/sair" method="POST">
            <button type="submit" className="p-2 text-[#5B5470] hover:text-[#1F1A2E] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="Sair">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Minhas matérias — SEMPRE o bloco principal */}
        <section>
          <h2 className="text-sm font-semibold text-[#5B5470] uppercase tracking-wide mb-3">Minhas matérias</h2>

          {materiasLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map((i) => (
                <div key={i} className="h-24 rounded-2xl animate-pulse bg-[#E9E5F5]" />
              ))}
            </div>
          ) : materiasErro ? (
            <div className="rounded-2xl border border-[#FEE2E2] bg-white p-6 text-center">
              <AlertCircle className="size-8 text-[#B91C1C] mx-auto mb-2" />
              <p className="font-semibold text-[#1F1A2E] text-sm">Não foi possível carregar as matérias.</p>
              <p className="text-xs text-[#5B5470] mt-1 mb-4">Verifique sua conexão e tente de novo.</p>
              <button
                onClick={loadMaterias}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] text-white text-sm font-medium hover:bg-[#5B21B6] transition-colors min-h-[44px]">
                <RefreshCw className="size-4" />
                Tentar de novo
              </button>
            </div>
          ) : materias.length === 0 ? (
            <div className="rounded-2xl border border-[#E9E5F5] bg-white p-6 text-center">
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
                const isFeito    = m.estado === "feito";
                const Icone = ICONES_MATERIA[m.codigo] ?? FlaskConical;
                return (
                  <Link key={m.codigo} href={href}
                    className="flex flex-col gap-2 rounded-2xl border-2 bg-white p-4 hover:shadow-md transition-all min-h-[90px]"
                    style={{ borderColor: m.cor + "40" }}>
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: m.cor + "18", color: m.cor }}>
                        <Icone className="size-4" />
                      </div>
                      {isEmTrilha && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: m.cor + "18", color: m.cor }}>Em trilha</span>
                      )}
                      {isFeito && !isEmTrilha && <CheckCircle2 className="size-4" style={{ color: m.cor }} />}
                      {!isEmTrilha && !isFeito && <ArrowRight className="size-4 text-[#5B5470]" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1F1A2E] leading-tight">{m.nome}</p>
                      <p className="text-[10px] text-[#5B5470] mt-0.5">
                        {isEmTrilha ? (m.trilhaAtual ?? "Em prática")
                          : isFeito ? "Diagnóstico feito · ver evolução"
                          : "Começar diagnóstico"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Dias da semana */}
        <section className="bg-white border border-[#E9E5F5] rounded-2xl p-4">
          <p className="text-xs font-semibold text-[#5B5470] uppercase tracking-wide mb-3">Esta semana</p>
          <div className="flex gap-2 justify-between">
            {DIAS_SEMANA.map((d, i) => {
              const isHoje  = i === hojeIndex;
              const praticou = diasSemana[i] ?? false;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    praticou ? "bg-[#6D28D9] text-white"
                      : isHoje ? "bg-[#EDE9FE] text-[#6D28D9] border-2 border-[#6D28D9]"
                      : "bg-[#F8F7FC] text-[#5B5470]"
                  }`}>{d}</div>
                </div>
              );
            })}
          </div>
          {diasSeguidos >= 2 && (
            <p className="text-xs text-[#6D28D9] font-semibold mt-3 text-center">{diasSeguidos} dias seguidos praticando. Continue assim!</p>
          )}
        </section>

        {/* Atalhos */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { href: "/escola/aluno/trilha",              icon: BookOpen,     label: "Minha trilha" },
            { href: "/escola/aluno/atividades/historico", icon: ClipboardList, label: "Feitas" },
            { href: "/escola/aluno/evolucao",             icon: TrendingUp,   label: "Evolução" },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 rounded-xl p-4 border border-[#E9E5F5] bg-white text-center hover:border-[#6D28D9] hover:shadow-sm transition-all">
              <Icon className="size-5 text-[#6D28D9]" />
              <span className="text-xs font-medium text-[#1F1A2E]">{label}</span>
            </Link>
          ))}
        </section>

        {/* Último retorno de atividade escolar */}
        {ultimoRetorno && (
          <section>
            <h2 className="text-sm font-semibold text-[#5B5470] uppercase tracking-wide mb-3">Último retorno</h2>
            <Link href={`/escola/aluno/atividades/${ultimoRetorno.id}/retorno`}
              className="flex items-center gap-4 rounded-xl border border-[#E9E5F5] bg-white p-4 hover:shadow-sm transition-all">
              <div className={`rounded-lg p-2 ${TYPE_COLOR[ultimoRetorno.type]}`}>
                {(() => { const Icon = TYPE_ICON[ultimoRetorno.type]; return <Icon className="size-5" />; })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1F1A2E] truncate">{ultimoRetorno.title}</p>
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
            <h2 className="text-sm font-semibold text-[#5B5470] uppercase tracking-wide mb-3">Para fazer</h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl animate-pulse bg-[#E9E5F5]" />
                ))}
              </div>
            ) : paraFazer.length === 0 ? (
              <div className="rounded-xl border border-[#E9E5F5] bg-white p-6 text-center">
                <CheckCircle2 className="size-8 text-[#166534] mx-auto mb-2" />
                <p className="font-semibold text-[#1F1A2E] text-sm">Tudo em dia!</p>
                {materias.length > 0 && (
                  <p className="text-xs text-[#5B5470] mt-1">Que tal praticar uma matéria de reforço acima?</p>
                )}
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
                      className="flex items-center gap-4 rounded-xl border border-[#E9E5F5] bg-white p-4 hover:shadow-md hover:border-[#6D28D9] transition-all group">
                      <div className="rounded-lg p-2.5 shrink-0" style={{ background: subjectColor + "18", color: subjectColor }}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[a.type]}`}>
                            {TYPE_LABEL[a.type]}
                          </span>
                          {a.subject && <span className="text-[10px] text-[#5B5470] truncate">{a.subject.name}</span>}
                        </div>
                        <p className="font-semibold text-[#1F1A2E] truncate mt-0.5">{a.title}</p>
                        {due && (
                          <p className={`text-xs mt-0.5 flex items-center gap-1 ${isUrgent ? "text-[#B91C1C]" : "text-[#5B5470]"}`}>
                            <Clock className="size-3" />
                            {isUrgent ? "Prazo hoje" : `Até ${due.toLocaleDateString("pt-BR")}`}
                          </p>
                        )}
                        {a.submission?.status === "IN_PROGRESS" && (
                          <p className="text-xs text-[#5B5470] mt-0.5">Rascunho salvo</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge sub={a.submission} />
                        <ChevronRight className="size-4 text-[#5B5470] group-hover:text-[#6D28D9] transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

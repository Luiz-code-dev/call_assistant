"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ChevronRight, Mic, PenLine, HelpCircle, Sparkles } from "lucide-react";
import { Capa, Conteudo, NavAluno, CARTAO, FUNDO, IconeMateria, materiaDe } from "@/components/escola/reforco-ui";

interface Atividade {
  id: string; title: string; type: "WRITTEN" | "SPOKEN" | "QUIZ";
  subject: { name: string; color: string | null } | null;
  subjectCode?: string | null;
  dueAt: string | null; isDone: boolean;
  submission: { status: string; masteryLevel: string | null; submittedAt: string | null } | null;
}

const TIPO = {
  WRITTEN: { Icone: PenLine, texto: "Resposta escrita" },
  SPOKEN: { Icone: Mic, texto: "Resposta falada" },
  QUIZ: { Icone: HelpCircle, texto: "Perguntas" },
};

const NIVEL: Record<string, { texto: string; fundo: string; cor: string; borda: string }> = {
  MASTERED: { texto: "Domina", fundo: "#DCFCE7", cor: "#166534", borda: "#86EFAC" },
  ALMOST: { texto: "Quase lá", fundo: "#FEF3C7", cor: "#92400E", borda: "#FCD34D" },
  NOT_YET: { texto: "Praticando", fundo: "#EDE9FE", cor: "#6D28D9", borda: "#C4B5FD" },
};

/** "Explicar: água poluída" -> etapa "Explicar" + assunto "água poluída" */
function partes(titulo: string) {
  const i = titulo.indexOf(":");
  if (i > 0 && i < 20) return { etapa: titulo.slice(0, i).trim(), assunto: titulo.slice(i + 1).trim() };
  return { etapa: null, assunto: titulo };
}

function chaveMateria(a: Atividade) {
  return a.subject?.name ?? a.subjectCode ?? null;
}

function nomeMateria(a: Atividade) {
  const m = materiaDe(chaveMateria(a));
  return m?.nome ?? a.subject?.name ?? "Reforço";
}

export default function HistoricoPage() {
  const router = useRouter();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("todas");

  useEffect(() => {
    fetch("/api/escola/aluno/atividades?filter=feito")
      .then((r) => { if (r.status === 401) router.replace("/escola/aluno/entrar"); return r.json(); })
      .then((d) => setAtividades(d.atividades ?? []))
      .finally(() => setLoading(false));
  }, [router]);

  const ordenadas = useMemo(() => [...atividades].sort((a, b) =>
    (b.submission?.submittedAt ?? "").localeCompare(a.submission?.submittedAt ?? "")), [atividades]);

  const materias = useMemo(() => {
    const vistas = new Map<string, number>();
    for (const a of ordenadas) vistas.set(nomeMateria(a), (vistas.get(nomeMateria(a)) ?? 0) + 1);
    return Array.from(vistas.entries());
  }, [ordenadas]);

  const resumo = useMemo(() => {
    const r = { MASTERED: 0, ALMOST: 0, NOT_YET: 0 };
    for (const a of atividades) {
      const n = a.submission?.masteryLevel as keyof typeof r | undefined;
      if (n && n in r) r[n]++;
    }
    return r;
  }, [atividades]);

  const visiveis = filtro === "todas" ? ordenadas : ordenadas.filter((a) => nomeMateria(a) === filtro);

  return (
    <div className={FUNDO}>
      <Capa largo titulo="Atividades feitas" subtitulo="Tudo o que você já entregou, com o retorno de cada uma."
        voltar={{ href: "/escola/aluno", texto: "Início" }}>
        {!loading && atividades.length > 0 && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-2xl bg-white/15 px-4 py-3">
              <p className="text-2xl font-extrabold leading-none">{atividades.length}</p>
              <p className="text-xs text-white/85 mt-1">{atividades.length === 1 ? "atividade feita" : "atividades feitas"}</p>
            </div>
            {(["MASTERED", "ALMOST", "NOT_YET"] as const).map((k) => (
              <div key={k} className="rounded-2xl bg-white/15 px-4 py-3">
                <p className="text-2xl font-extrabold leading-none">{resumo[k]}</p>
                <p className="text-xs text-white/85 mt-1">{NIVEL[k].texto}</p>
              </div>
            ))}
          </div>
        )}
      </Capa>

      <Conteudo largo>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-36 rounded-3xl animate-pulse bg-[#E9E5F5]" />)}</div>
        ) : atividades.length === 0 ? (
          <section className={`${CARTAO} p-10 text-center`}>
            <CheckCircle2 className="size-12 text-[#C4B5FD] mx-auto mb-3" />
            <p className="text-lg font-extrabold text-[#1F1A2E]">Nenhuma atividade concluída ainda</p>
            <p className="text-sm text-[#5B5470] mt-1">Quando você terminar uma etapa da trilha, ela aparece aqui.</p>
            <Link href="/escola/aluno/trilha" className="inline-flex mt-5 items-center gap-2 rounded-2xl bg-[#6D28D9] text-white font-bold min-h-[48px] px-5">Ir para a minha trilha</Link>
          </section>
        ) : (
          <>
            {materias.length > 1 && (
              <div className={`${CARTAO} p-2 flex gap-2 overflow-x-auto`}>
                {[["todas", atividades.length] as [string, number], ...materias].map(([nome, qtd]) => {
                  const on = filtro === nome;
                  return (
                    <button key={nome} onClick={() => setFiltro(nome)}
                      className={`shrink-0 rounded-2xl px-4 min-h-[44px] text-sm font-semibold flex items-center gap-2 ${on ? "bg-[#6D28D9] text-white" : "text-[#5B5470] hover:bg-[#F6F4FE]"}`}>
                      {nome === "todas" ? "Todas" : nome}
                      <span className={`text-xs rounded-full px-2 py-0.5 ${on ? "bg-white/20" : "bg-[#EDE9FE] text-[#6D28D9]"}`}>{qtd}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {visiveis.map((a) => {
                const tipo = TIPO[a.type] ?? TIPO.WRITTEN;
                const { etapa, assunto } = partes(a.title);
                const m = materiaDe(chaveMateria(a));
                const cor = m?.cor ?? "#6D28D9";
                const analisando = a.submission?.status === "SUBMITTED";
                const nivel = a.submission?.masteryLevel ? NIVEL[a.submission.masteryLevel] : null;
                const data = a.submission?.submittedAt ? new Date(a.submission.submittedAt) : null;
                return (
                  <Link key={a.id} href={`/escola/aluno/atividades/${a.id}/retorno`}
                    className={`${CARTAO} relative overflow-hidden p-5 pl-6 flex flex-col gap-4 active:scale-[0.99] transition-transform hover:shadow-[0_8px_28px_rgba(91,33,182,0.14)]`}>
                    <span className="absolute left-0 inset-y-0 w-1.5" style={{ background: cor }} aria-hidden="true" />
                    <div className="flex items-start gap-3">
                      <IconeMateria chave={chaveMateria(a)} tamanho={44} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cor }}>{nomeMateria(a)}{etapa ? ` · ${etapa}` : ""}</p>
                        <p className="text-[17px] font-extrabold text-[#1F1A2E] leading-snug mt-0.5 first-letter:uppercase">{assunto}</p>
                      </div>
                      <ChevronRight className="size-5 text-[#A59FB8] shrink-0 mt-1" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs text-[#5B5470] min-w-0">
                        <span className="inline-flex items-center gap-1.5"><tipo.Icone className="size-3.5 text-[#6D28D9]" />{tipo.texto}</span>
                        {data && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>}
                      </div>
                      {analisando ? (
                        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-xs font-bold px-3 py-1.5"><Clock className="size-3.5" />Analisando</span>
                      ) : nivel ? (
                        <span className="shrink-0 rounded-full text-xs font-bold px-3 py-1.5 border" style={{ background: nivel.fundo, color: nivel.cor, borderColor: nivel.borda }}>{nivel.texto}</span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FE] text-[#6D28D9] text-xs font-bold px-3 py-1.5"><Sparkles className="size-3.5" />Ver retorno</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </Conteudo>
      <NavAluno ativo="feitas" />
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Capa, Conteudo, NavAluno, CARTAO, BOTAO, FUNDO, Carregando, IconeMateria, SeloNivel, materiaDe } from "@/components/escola/reforco-ui";
import { fraseParaAluno } from "@/lib/escola/evolucao-degraus";

interface SkillProgress { subjectName: string; subjectColor: string; skills: { code: string; description: string; level: string; levelInicial?: string | null }[] }
interface Resumo { subiu: number; manteve: number; desceu: number; semInicio: number; atencao: number; subiuNaSemana: number }

// Os três degraus, do primeiro ao último.
const DEGRAUS = [
  { key: "NOT_YET", label: "Praticando", cor: "#8B5CF6", altura: 10 },
  { key: "ALMOST", label: "Quase lá", cor: "#F59E0B", altura: 18 },
  { key: "MASTERED", label: "Domina", cor: "#16A34A", altura: 26 },
] as const;

/** Escada de três degraus: onde o aluno começou e onde está neste conteúdo. */
function Escada({ inicial, atual }: { inicial: string | null; atual: string }) {
  const iAtual = DEGRAUS.findIndex((d) => d.key === atual);
  const iInicial = DEGRAUS.findIndex((d) => d.key === inicial);
  return (
    <div className="flex items-end gap-1.5 mt-2.5" role="img" aria-label={`Escada de três degraus. ${fraseParaAluno(inicial, atual)}`}>
      {DEGRAUS.map((d, i) => {
        const marca = i === iAtual && i === iInicial ? "você começou e está aqui" : i === iAtual ? "você está aqui" : i === iInicial ? "você começou aqui" : "";
        return (
          <div key={d.key} className="flex-1 min-w-0">
            <div className="rounded-md" style={{ height: d.altura, backgroundColor: i <= iAtual ? d.cor : "#E7E3F3", outline: i === iAtual ? `2px solid ${d.cor}` : "none", outlineOffset: 2 }} />
            <p className={`text-[11px] mt-1.5 leading-tight ${i === iAtual ? "font-bold text-[#1F1A2E]" : "text-[#5B5470]"}`}>{d.label}</p>
            <p className="text-[10px] leading-tight text-[#6D28D9] font-semibold min-h-[12px]">{marca}</p>
          </div>
        );
      })}
    </div>
  );
}

const ORDEM: Record<string, number> = { MASTERED: 2, ALMOST: 1, NOT_YET: 0 };

export default function EvolucaoPage() {
  const [data, setData] = useState<SkillProgress[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  function carregar() {
    setLoading(true); setErro(false);
    fetch("/api/escola/aluno/evolucao")
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => { setData(d.subjects ?? []); setResumo(d.evolucao ?? null); })
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { carregar(); }, []);

  if (loading) return <Carregando texto="Carregando sua evolução..." />;

  const total = data.reduce((n, s) => n + s.skills.length, 0);
  const dominadas = data.reduce((n, s) => n + s.skills.filter(k => k.level === "MASTERED").length, 0);

  return (
    <div className={FUNDO}>
      <Capa titulo="Minha evolução" subtitulo="Veja o que você já domina e o que está praticando."
        voltar={{ href: "/escola/aluno", texto: "Início" }} />
      <Conteudo>
        {erro ? (
          <section className={`${CARTAO} p-6 text-center`}>
            <p className="text-[#1F1A2E] font-semibold text-sm">Não foi possível carregar a sua evolução.</p>
            <button onClick={carregar} className={`${BOTAO} mt-4`}>Tentar de novo</button>
          </section>
        ) : data.length === 0 ? (
          <section className={`${CARTAO} p-8 text-center`}>
            <p className="text-[#1F1A2E] font-extrabold text-lg">Sua evolução começa aqui</p>
            <p className="text-[#5B5470] text-sm mt-1">Faça o diagnóstico de uma matéria e acompanhe o seu progresso.</p>
            <Link href="/escola/aluno" className={`${BOTAO} mt-5`}>Escolher uma matéria</Link>
          </section>
        ) : (
          <>
            <section className={`${CARTAO} p-5 flex items-center gap-4`}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] flex items-center justify-center text-white text-xl font-extrabold shrink-0">
                {dominadas}
              </div>
              <div>
                <p className="font-extrabold text-[#1F1A2E]">{dominadas === 1 ? "conteúdo dominado" : "conteúdos dominados"}</p>
                <p className="text-xs text-[#5B5470]">de {total} que você já praticou em {data.length} {data.length === 1 ? "matéria" : "matérias"}</p>
              </div>
            </section>

            {resumo && resumo.subiu + resumo.manteve + resumo.desceu > 0 && (
              <section className={`${CARTAO} p-5`}>
                <h2 className="font-extrabold text-[#1F1A2E]">Desde que você começou</h2>
                <p className="text-sm text-[#5B5470] mt-1">
                  {resumo.subiu > 0
                    ? `Você subiu de degrau em ${resumo.subiu} ${resumo.subiu === 1 ? "conteúdo" : "conteúdos"}.`
                    : "Você ainda está nos mesmos degraus do começo. Cada atividade ajuda a subir."}
                </p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="rounded-2xl bg-[#DCFCE7] px-2 py-3">
                    <p className="text-xl font-extrabold text-[#166534]">{resumo.subiu}</p>
                    <p className="text-[11px] font-semibold text-[#166534] leading-tight">subiram de degrau</p>
                  </div>
                  <div className="rounded-2xl bg-[#F3F0FB] px-2 py-3">
                    <p className="text-xl font-extrabold text-[#1F1A2E]">{resumo.manteve}</p>
                    <p className="text-[11px] font-semibold text-[#5B5470] leading-tight">no mesmo degrau</p>
                  </div>
                  <div className="rounded-2xl bg-[#EDE9FE] px-2 py-3">
                    <p className="text-xl font-extrabold text-[#6D28D9]">{resumo.atencao}</p>
                    <p className="text-[11px] font-semibold text-[#6D28D9] leading-tight">para praticar</p>
                  </div>
                </div>
              </section>
            )}

            <section className={`${CARTAO} p-5`}>
              <h2 className="font-extrabold text-[#1F1A2E]">Como funcionam os degraus</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-[#5B5470]">
                <li><span className="font-bold text-[#6D28D9]">Praticando:</span> você está aprendendo este conteúdo.</li>
                <li><span className="font-bold text-[#92400E]">Quase lá:</span> você já acerta bastante, falta pouco.</li>
                <li><span className="font-bold text-[#166534]">Domina:</span> você já sabe este conteúdo.</li>
              </ul>
            </section>

            {data.map(subj => {
              const m = materiaDe(subj.subjectName);
              const cor = m?.cor ?? subj.subjectColor ?? "#6D28D9";
              const dom = subj.skills.filter(k => k.level === "MASTERED").length;
              const skills = [...subj.skills].sort((a, b) => (ORDEM[a.level] ?? 0) - (ORDEM[b.level] ?? 0));
              return (
                <section key={subj.subjectName} className={`${CARTAO} p-4`}>
                  <div className="flex items-center gap-3 mb-3">
                    <IconeMateria chave={subj.subjectName} tamanho={44} />
                    <div className="flex-1 min-w-0">
                      <h2 className="font-extrabold text-[#1F1A2E]">{subj.subjectName}</h2>
                      <div className="mt-1.5 h-2 bg-[#F3F0FB] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${subj.skills.length ? (dom / subj.skills.length) * 100 : 0}%`, background: cor }} />
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {skills.map(sk => (
                      <li key={sk.code} className="rounded-2xl bg-[#F8F7FC] px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex-1 text-sm font-semibold text-[#1F1A2E] leading-snug">{sk.description}</span>
                          <SeloNivel nivel={sk.level} />
                        </div>
                        <Escada inicial={sk.levelInicial ?? null} atual={sk.level} />
                        <p className="text-xs text-[#5B5470] mt-1.5">{fraseParaAluno(sk.levelInicial, sk.level)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </>
        )}
      </Conteudo>
      <NavAluno ativo="evolucao" />
    </div>
  );
}

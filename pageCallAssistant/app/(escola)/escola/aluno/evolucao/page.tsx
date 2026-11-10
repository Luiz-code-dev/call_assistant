"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Capa, Conteudo, NavAluno, CARTAO, BOTAO, FUNDO, Carregando, IconeMateria, SeloNivel, materiaDe } from "@/components/escola/reforco-ui";

interface SkillProgress { subjectName: string; subjectColor: string; skills: { code: string; description: string; level: string }[] }

const ORDEM: Record<string, number> = { MASTERED: 2, ALMOST: 1, NOT_YET: 0 };

export default function EvolucaoPage() {
  const [data, setData] = useState<SkillProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  function carregar() {
    setLoading(true); setErro(false);
    fetch("/api/escola/aluno/evolucao")
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => setData(d.subjects ?? []))
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
                      <li key={sk.code} className="flex items-center gap-3 rounded-2xl bg-[#F8F7FC] px-3 py-2.5">
                        <span className="flex-1 text-sm text-[#1F1A2E] leading-snug">{sk.description}</span>
                        <SeloNivel nivel={sk.level} />
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

"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";
import FamilyShell from "@/components/escola/familia/FamilyShell";
import { SemanaDoFilho } from "@/components/escola/familia/Acompanhamento";
import { IconeMateria } from "@/components/escola/reforco-ui";
import { fraseDoCaminho, passos } from "@/lib/escola/evolucao-degraus";

const LEVELS = [
  { key: "MASTERED", label: "Domina", fg: "#166534", bg: "#DCFCE7", bar: "#16A34A" },
  { key: "ALMOST", label: "Quase lá", fg: "#92400E", bg: "#FEF3C7", bar: "#F59E0B" },
  { key: "NOT_YET", label: "Praticando", fg: "#6D28D9", bg: "#EDE9FE", bar: "#8B5CF6" },
] as const;
const lv = (k: string | null) => LEVELS.find((l) => l.key === k);

// Os três degraus, do primeiro ao último, para desenhar a escada de cada conteúdo.
const DEGRAUS = [
  { key: "NOT_YET", label: "Praticando", cor: "#8B5CF6", altura: 10 },
  { key: "ALMOST", label: "Quase lá", cor: "#F59E0B", altura: 18 },
  { key: "MASTERED", label: "Domina", cor: "#16A34A", altura: 26 },
] as const;

/** Escada de três degraus: mostra onde o aluno começou e onde está em um conteúdo. */
function Escada({ inicial, atual }: { inicial: string | null; atual: string }) {
  const iAtual = DEGRAUS.findIndex((d) => d.key === atual);
  const iInicial = DEGRAUS.findIndex((d) => d.key === inicial);
  const descricao = `Escada de três degraus. ${fraseDoCaminho(inicial, atual)}`;
  return (
    <div className="flex items-end gap-1.5 mt-2" role="img" aria-label={descricao}>
      {DEGRAUS.map((d, i) => {
        const alcancado = i <= iAtual;
        const marca = i === iAtual && i === iInicial ? "começou e está aqui" : i === iAtual ? "está aqui" : i === iInicial ? "começou aqui" : "";
        return (
          <div key={d.key} className="flex-1 min-w-0">
            <div className="rounded-md" style={{ height: d.altura, backgroundColor: alcancado ? d.cor : "#ECE9F5", outline: i === iAtual ? `2px solid ${d.cor}` : "none", outlineOffset: 2 }} />
            <p className={`text-[11px] mt-1.5 leading-tight ${i === iAtual ? "font-bold text-[#1F1A2E]" : "text-[#5B5470]"}`}>{d.label}</p>
            <p className="text-[10px] leading-tight text-[#6D28D9] font-semibold min-h-[12px]">{marca}</p>
          </div>
        );
      })}
    </div>
  );
}

interface Evo {
  aluno: { fullName: string | null; className: string | null; gradeYear?: number | null };
  resumo: { MASTERED: number; ALMOST: number; NOT_YET: number };
  evolucao?: { subiu: number; manteve: number; desceu: number; semInicio: number; atencao: number; subiuNaSemana: number };
  componentes: { name: string; color: string; habilidades: { skillId: string; code: string; label: string; level: string; levelInicial: string | null; levelSemana?: string | null; ano?: string | null }[] }[];
}

export default function EvolucaoCompleta() {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<Evo | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("TODAS");

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch(`/api/escola/familia/filhos/${studentId}/evolucao`);
      if (!r.ok) { setError(true); return; }
      setData(await r.json());
    } catch { setError(true); } finally { setLoading(false); }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);

  const total = data ? data.resumo.MASTERED + data.resumo.ALMOST + data.resumo.NOT_YET : 0;
  const primeiroNome = (data?.aluno.fullName ?? "").trim().split(/\s+/)[0] || "O aluno";
  const ev = data?.evolucao;
  // Conteúdos que subiram de degrau nos últimos 7 dias.
  const subiramNaSemana = data
    ? data.componentes.flatMap((c) => c.habilidades.filter((h) => (passos(h.levelSemana ?? null, h.level) ?? 0) > 0).map((h) => ({ ...h, materia: c.name })))
    : [];

  return (
    <FamilyShell activeStudentId={studentId} voltar={{ href: `/escola/familia/${studentId}`, texto: "Painel" }}
      titulo="Evolução" subtitulo={data ? [data.aluno.fullName, data.aluno.className].filter(Boolean).join(" · ") : undefined}>
      <div className="max-w-[760px] mx-auto space-y-4">

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-3xl bg-white/70 animate-pulse" />)}</div>
        ) : error ? (
          <div className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4"><AlertTriangle size={26} className="text-[#B91C1C]" /></div>
            <p className="text-[#1F1A2E] font-semibold mb-3">Não foi possível carregar. Tente de novo.</p>
            <button onClick={load} className="inline-flex items-center gap-2 bg-[#6D28D9] text-white px-5 min-h-[48px] rounded-2xl text-sm font-bold"><RefreshCw size={15} /> Tentar de novo</button>
          </div>
        ) : data ? (
          <>
            {total === 0 ? (
              <div className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-6 text-center text-[#5B5470] text-sm">O diagnóstico ainda não foi feito. Assim que for realizado, você verá aqui as habilidades já dominadas e as que serão praticadas.</div>
            ) : (
              <>
                {/* Resumo: de onde partiu e o que mudou */}
                {ev && (
                  <section className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-5">
                    <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Desde o diagnóstico</h2>
                    <p className="text-[14px] text-[#1F1A2E] mt-1">
                      {ev.subiu > 0
                        ? `${primeiroNome} subiu de degrau em ${ev.subiu} ${ev.subiu === 1 ? "conteúdo" : "conteúdos"}.`
                        : `${primeiroNome} ainda não subiu de degrau em nenhum conteúdo. Cada etapa concluída da trilha conta para subir.`}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="rounded-2xl bg-[#DCFCE7] px-3 py-3 text-center">
                        <p className="text-[24px] font-extrabold text-[#166534] leading-none">{ev.subiu}</p>
                        <p className="text-[11px] font-semibold text-[#166534] mt-1.5">subiram de degrau</p>
                      </div>
                      <div className="rounded-2xl bg-[#F3F0FB] px-3 py-3 text-center">
                        <p className="text-[24px] font-extrabold text-[#3B2F63] leading-none">{ev.manteve}</p>
                        <p className="text-[11px] font-semibold text-[#3B2F63] mt-1.5">no mesmo degrau</p>
                      </div>
                      <div className="rounded-2xl bg-[#EDE9FE] px-3 py-3 text-center">
                        <p className="text-[24px] font-extrabold text-[#6D28D9] leading-none">{ev.atencao}</p>
                        <p className="text-[11px] font-semibold text-[#6D28D9] mt-1.5">em Praticando</p>
                      </div>
                    </div>
                    {(ev.desceu > 0 || ev.semInicio > 0) && (
                      <p className="text-[12px] text-[#5B5470] mt-3">
                        {ev.desceu > 0 ? `${ev.desceu} ${ev.desceu === 1 ? "conteúdo precisa" : "conteúdos precisam"} ser retomados. ` : ""}
                        {ev.semInicio > 0 ? `${ev.semInicio} ${ev.semInicio === 1 ? "conteúdo não passou" : "conteúdos não passaram"} pelo diagnóstico inicial.` : ""}
                      </p>
                    )}
                  </section>
                )}

                {/* O que melhorou nesta semana */}
                {ev && (
                  <section className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-5">
                    <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">O que melhorou nos últimos 7 dias</h2>
                    {subiramNaSemana.length === 0 ? (
                      <p className="text-[13px] text-[#5B5470] mt-1">Nenhum conteúdo mudou de degrau nesta semana. O degrau sobe quando o acerto se repete nas atividades.</p>
                    ) : (
                      <ul className="mt-3 space-y-2.5">
                        {subiramNaSemana.map((h) => (
                          <li key={h.skillId} className="flex items-start gap-2.5">
                            <span className="mt-0.5 inline-flex items-center justify-center size-7 rounded-full bg-[#DCFCE7] shrink-0"><TrendingUp size={15} className="text-[#166534]" /></span>
                            <div className="min-w-0">
                              <p className="text-[14px] text-[#1F1A2E]">{h.label}</p>
                              <p className="text-[12px] text-[#5B5470]">{h.materia} · de {lv(h.levelSemana ?? null)?.label} para {lv(h.level)?.label}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                {/* Gráfico: como está em cada matéria */}
                <section className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-5">
                  <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Como está em cada matéria</h2>
                  <p className="text-[12px] text-[#5B5470] mb-4">{total} {total === 1 ? "conteúdo acompanhado" : "conteúdos acompanhados"}</p>
                  <div className="space-y-3">
                    {data.componentes.map((c) => {
                      const n = { MASTERED: 0, ALMOST: 0, NOT_YET: 0 } as Record<string, number>;
                      for (const h of c.habilidades) if (n[h.level] !== undefined) n[h.level]++;
                      const t = Math.max(1, n.MASTERED + n.ALMOST + n.NOT_YET);
                      return (
                        <div key={c.name}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <IconeMateria chave={c.name} tamanho={26} />
                            <span className="text-[14px] font-bold text-[#1F1A2E] flex-1 min-w-0 truncate">{c.name}</span>
                            <span className="text-[12px] text-[#5B5470] shrink-0">{n.MASTERED} de {t} dominados</span>
                          </div>
                          <div className="flex h-4 rounded-full overflow-hidden bg-[#F3F0FB]">
                            {LEVELS.map((l) => n[l.key] ? <div key={l.key} style={{ width: `${(n[l.key] / t) * 100}%`, backgroundColor: l.bar }} title={`${l.label}: ${n[l.key]}`} /> : null)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {LEVELS.map((l) => (
                      <span key={l.key} className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ color: l.fg, backgroundColor: l.bg }}>
                        <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: l.bar }} />{l.label} {data.resumo[l.key]}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Dia a dia */}
                <SemanaDoFilho studentId={studentId} />

                {/* Como ler */}
                <section className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-5">
                  <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Como ler os degraus</h2>
                  <ul className="mt-3 space-y-2 text-[13px] text-[#3B2F63]">
                    <li><span className="font-bold text-[#6D28D9]">Praticando:</span> ainda acerta menos de 4 em cada 10 neste conteúdo.</li>
                    <li><span className="font-bold text-[#92400E]">Quase lá:</span> já acerta parte, de 4 a 6 em cada 10, ou acertou uma vez e ainda vai confirmar.</li>
                    <li><span className="font-bold text-[#166534]">Domina:</span> acerta 7 ou mais em cada 10, e repetiu esse resultado.</li>
                  </ul>
                  <p className="text-[12px] text-[#5B5470] mt-3">
                    O ponto de partida é o primeiro diagnóstico de cada conteúdo. O degrau de hoje vem das três atividades mais recentes, por isso um acerto ou um erro isolado não muda o degrau sozinho.
                    {data.aluno.gradeYear ? ` A turma é do ${data.aluno.gradeYear}º ano: conteúdos de anos anteriores são a base que o reforço está recuperando.` : ""}
                  </p>
                </section>

                {/* Filtros */}
                <div className="flex gap-2 flex-wrap">
                  {[{ k: "TODAS", l: "Todas" }, ...LEVELS.map((l) => ({ k: l.key, l: l.label }))].map((f) => (
                    <button key={f.k} onClick={() => setFiltro(f.k)} className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium ${filtro === f.k ? "bg-[#6D28D9] text-white" : "bg-white border border-[#E9E5F5] text-[#5B5470]"}`}>{f.l}</button>
                  ))}
                </div>

                {/* Lista por componente */}
                {data.componentes.map((c) => {
                  const habs = c.habilidades.filter((h) => filtro === "TODAS" || h.level === filtro);
                  if (!habs.length) return null;
                  return (
                    <div key={c.name} className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-4">
                      <div className="flex items-center gap-3 mb-3"><IconeMateria chave={c.name} tamanho={40} /><h2 className="text-[16px] font-extrabold text-[#1F1A2E]">{c.name}</h2></div>
                      <div className="space-y-3">
                        {habs.map((h) => {
                          const cur = lv(h.level); const ini = lv(h.levelInicial);
                          return (
                            <div key={h.skillId} className="flex items-start gap-2 border-t border-[#F0EDF9] pt-3 first:border-0 first:pt-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold text-[#1F1A2E]">{h.label}</p>
                                {h.ano && <p className="text-[11px] text-[#5B5470] mt-0.5">Conteúdo do {h.ano}</p>}
                                <Escada inicial={ini ? h.levelInicial : null} atual={h.level} />
                                <p className="text-[12px] text-[#5B5470] mt-1.5">{fraseDoCaminho(ini ? h.levelInicial : null, h.level)}</p>
                              </div>
                              {cur && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: cur.fg, backgroundColor: cur.bg }}>{cur.label}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        ) : null}
      </div>
    </FamilyShell>
  );
}

"use client";
/**
 * Professor revisa o texto do aluno: vê o retorno do Flow, esconde o que não concorda,
 * comenta cada parágrafo e libera para o aluno. Os níveis por critério são só daqui.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, AlertTriangle, Save, Eye, EyeOff } from "lucide-react";
import { ParagrafoComRetorno } from "@/components/escola/redacao/RetornoDaRedacao";
import { CRITERIOS, NIVEIS, nomeDoCriterio, type RetornoRedacao, type RevisaoProfessor } from "@/lib/escola/redacao";

type Dados = {
  proposta: { id: string; titulo: string; enunciado: string; genero: string };
  turma: { name: string };
  aluno: { nome: string };
  versoes: { id: string; versao: number; status: string }[];
  texto: { id: string; versao: number; status: string; palavras: number; enviadoEm: string | null; paragrafos: string[]; origem: string | null; retorno: RetornoRedacao | null; revisao: RevisaoProfessor | null; revisadoEm: string | null };
};

const CAMPO = "w-full rounded-xl border border-[#DDD6EE] focus:border-[#6D28D9] outline-none px-3 py-2 text-sm text-[#1F1A2E] bg-white";

export default function RevisarRedacaoPage() {
  const { id, textoId } = useParams<{ id: string; textoId: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());
  const [porParagrafo, setPorParagrafo] = useState<Record<string, string>>({});
  const [geral, setGeral] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(() => {
    fetch(`/api/escola/professor/redacoes/${id}/textos/${textoId}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d as Dados; })
      .then((d) => {
        setDados(d);
        setOcultos(new Set(d.texto.revisao?.ocultos ?? []));
        setPorParagrafo(d.texto.revisao?.porParagrafo ?? {});
        setGeral(d.texto.revisao?.comentarioGeral ?? "");
      })
      .catch((e) => setErro(e.message || "Não foi possível carregar."));
  }, [id, textoId]);
  useEffect(() => { carregar(); }, [carregar]);

  async function salvar() {
    setSalvando(true); setAviso(""); setErro("");
    try {
      const r = await fetch(`/api/escola/professor/redacoes/${id}/textos/${textoId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentarioGeral: geral, porParagrafo, ocultos: Array.from(ocultos) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.error ?? "Não foi possível salvar."); return; }
      setAviso("Revisão salva. O aluno já vê os seus comentários e pode reescrever.");
      carregar();
    } finally { setSalvando(false); }
  }

  function alternar(idAp: string) {
    setOcultos((s) => { const n = new Set(s); if (n.has(idAp)) n.delete(idAp); else n.add(idAp); return n; });
  }

  if (erro && !dados) return <div className="px-7 py-8"><p className="text-[#B91C1C]">{erro}</p></div>;
  if (!dados) return <div className="px-7 py-8 text-[#5B5470]">Carregando...</div>;
  const t = dados.texto;
  const r = t.retorno;
  const atencao = t.origem === "FLAGGED" || r?.atencao;

  return (
    <div className="px-4 sm:px-7 py-8 max-w-4xl mx-auto space-y-5">
      <Link href={`/escola/professor/redacoes/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#6D28D9]"><ChevronLeft size={16} />{dados.proposta.titulo}</Link>
      <div>
        <h1 className="text-[#1F1A2E] font-bold text-2xl">{dados.aluno.nome}</h1>
        <p className="text-sm text-[#5B5470]">{dados.turma.name} · versão {t.versao} · {t.palavras} palavras{t.enviadoEm ? ` · enviado em ${new Date(t.enviadoEm).toLocaleString("pt-BR")}` : ""}</p>
      </div>

      {dados.versoes.filter((v) => v.status !== "DRAFT").length > 1 && (
        <div className="flex flex-wrap gap-2">
          {dados.versoes.filter((v) => v.status !== "DRAFT").map((v) => (
            <Link key={v.id} href={`/escola/professor/redacoes/${id}/${v.id}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${v.id === t.id ? "bg-[#6D28D9] text-white" : "bg-white border border-[#DDD6FE] text-[#5B21B6]"}`}>Versão {v.versao}</Link>
          ))}
        </div>
      )}

      {atencao && (
        <p className="flex items-start gap-2 rounded-xl bg-[#FFFBEB] border border-[#FCD34D] px-4 py-3 text-sm text-[#78350F]">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          {t.origem === "FLAGGED"
            ? "Este texto não foi enviado à inteligência artificial porque pode conter um assunto sensível. Leia com atenção e, se for o caso, siga o protocolo da escola. O aluno só vê os seus comentários."
            : "O Flow indicou que o texto pode trazer um relato pessoal sensível. Leia com atenção e, se for o caso, siga o protocolo da escola."}
        </p>
      )}
      {t.origem === "FALLBACK" && <p className="rounded-xl bg-[#F3F4F6] px-4 py-3 text-sm text-[#374151]">Retorno automático simples: a inteligência artificial não respondeu neste envio. Os seus comentários são ainda mais importantes aqui.</p>}

      {r && Object.keys(r.niveis ?? {}).length > 0 && (
        <div className="bg-white border border-[#E9E5F5] rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6D28D9] mb-2">Leitura do Flow por critério (só você vê)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CRITERIOS.filter((c) => r.niveis[c]).map((c) => (
              <p key={c} className="text-sm text-[#1F1A2E] flex justify-between gap-2"><span>{nomeDoCriterio(c, dados.proposta.genero)}</span><span className="font-semibold">{NIVEIS[r.niveis[c] as number]}</span></p>
            ))}
          </div>
        </div>
      )}

      {r && (
        <div className="bg-white border border-[#E9E5F5] rounded-xl p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6D28D9]">Retorno geral do Flow</p>
          <p className="text-sm text-[#1F1A2E]"><span className="font-semibold">Ponto forte: </span>{r.geral.pontoForte}</p>
          <p className="text-sm text-[#1F1A2E]"><span className="font-semibold">Foco da reescrita: </span>{r.geral.foco}</p>
        </div>
      )}

      {t.paragrafos.map((par, i) => {
        const rp = r?.paragrafos.find((x) => x.indice === i);
        return (
          <ParagrafoComRetorno key={i} numero={i + 1} paragrafo={par} genero={dados.proposta.genero}
            apontamentos={rp?.apontamentos ?? []} pontoForte={rp?.pontoForte}
            extraDoApontamento={(a) => (
              <button type="button" onClick={() => alternar(a.id)} className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 ${ocultos.has(a.id) ? "bg-[#F3F4F6] text-[#6B7280]" : "bg-[#F5F3FF] text-[#5B21B6]"}`}>
                {ocultos.has(a.id) ? <><EyeOff size={13} />Escondido do aluno</> : <><Eye size={13} />Aluno vê</>}
              </button>
            )}
            rodape={
              <textarea className={CAMPO} rows={2} maxLength={1000} placeholder="Seu comentário para este parágrafo (opcional)"
                value={porParagrafo[String(i)] ?? ""} onChange={(e) => setPorParagrafo({ ...porParagrafo, [String(i)]: e.target.value })} />
            }
          />
        );
      })}

      <div className="bg-white border border-[#E9E5F5] rounded-xl p-4 space-y-3">
        <label className="block text-sm font-semibold text-[#1F1A2E] space-y-1">Comentário geral para o aluno
          <textarea className={CAMPO} rows={3} maxLength={2000} value={geral} onChange={(e) => setGeral(e.target.value)} placeholder="Ex.: Sua opinião está clara. Na reescrita, capriche nos exemplos." />
        </label>
        {erro && <p className="text-sm text-[#B91C1C]">{erro}</p>}
        {aviso && <p className="text-sm text-[#166534]">{aviso}</p>}
        <div className="flex justify-end">
          <button type="button" onClick={salvar} disabled={salvando} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-60">
            <Save size={15} />{salvando ? "Salvando..." : t.status === "REVIEWED" ? "Atualizar revisão" : "Salvar e liberar para o aluno"}
          </button>
        </div>
      </div>
    </div>
  );
}

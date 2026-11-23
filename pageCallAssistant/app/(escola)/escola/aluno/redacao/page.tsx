"use client";
/** Redações que o professor abriu para a turma do aluno. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, ChevronRight, Plus, X } from "lucide-react";
import { GENEROS } from "@/lib/escola/redacao";
import { Capa, Carregando } from "@/components/escola/reforco-ui";
import { RoboFlow } from "@/components/escola/aluno/Mascote";

type Proposta = { id: string; titulo: string; genero: string; prazo: string | null; aberta: boolean; situacao: string; versao: number; propria?: boolean };

const CAMPO = "block w-full rounded-2xl border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] outline-none px-3 py-2.5 text-[15px] text-[#1F1A2E] bg-white";

const SITUACAO: Record<string, { texto: string; cor: string }> = {
  nova:          { texto: "Para escrever",          cor: "bg-[#EDE9FE] text-[#5B21B6]" },
  rascunho:      { texto: "Rascunho guardado",      cor: "bg-[#FEF3C7] text-[#92400E]" },
  aguardando:    { texto: "Com o professor",        cor: "bg-[#E0F2FE] text-[#075985]" },
  "com-retorno": { texto: "Retorno do Flow",        cor: "bg-[#DCFCE7] text-[#166534]" },
  revisada:      { texto: "Professor comentou",     cor: "bg-[#DCFCE7] text-[#166534]" },
};

export default function RedacoesAlunoPage() {
  const router = useRouter();
  const [lista, setLista] = useState<Proposta[] | null>(null);
  const [trazendo, setTrazendo] = useState(false);
  const [nova, setNova] = useState({ titulo: "", genero: "DISSERTATIVO", enunciado: "" });
  const [erro, setErro] = useState("");
  const [criando, setCriando] = useState(false);

  async function trazer(e: React.FormEvent) {
    e.preventDefault();
    setCriando(true); setErro("");
    try {
      const r = await fetch("/api/escola/aluno/redacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nova) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.error ?? "Não consegui abrir. Tente de novo."); return; }
      router.push(`/escola/aluno/redacao/${d.id}`);
    } catch {
      setErro("A internet caiu. Tente de novo.");
    } finally { setCriando(false); }
  }

  useEffect(() => {
    fetch("/api/escola/aluno/redacoes", { cache: "no-store" })
      .then((r) => { if (r.status === 401) router.replace("/escola/aluno/entrar"); return r.json(); })
      .then((d) => setLista(d.propostas ?? []))
      .catch(() => setLista([]));
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F6F4FE]">
      <Capa compacta titulo="Redação" subtitulo="Escreva e o Flow te ajuda a melhorar" voltar={{ href: "/escola/aluno", texto: "Início" }} />
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-3 pb-8">
        <button type="button" onClick={() => setTrazendo((v) => !v)} className="w-full rounded-3xl border-2 border-dashed border-[#C4B5FD] bg-white text-[#5B21B6] font-bold min-h-[56px] flex items-center justify-center gap-2">
          {trazendo ? <><X className="size-5" />Fechar</> : <><Plus className="size-5" />Trazer uma redação da escola</>}
        </button>
        {trazendo && (
          <form onSubmit={trazer} className="rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)] space-y-3">
            <p className="text-[14px] text-[#5B5470]">Tem uma redação para fazer na escola? Conte o tema e depois escreva aqui ou tire uma foto do caderno. O Flow te ajuda a melhorar, sem escrever por você.</p>
            <label className="block text-[14px] font-bold text-[#1F1A2E] space-y-1">Tema da redação
              <input className={CAMPO} value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} maxLength={160} required placeholder="Ex.: A importância da água" />
            </label>
            <label className="block text-[14px] font-bold text-[#1F1A2E] space-y-1">Tipo de texto
              <select className={CAMPO} value={nova.genero} onChange={(e) => setNova({ ...nova, genero: e.target.value })}>
                {Object.entries(GENEROS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
              </select>
            </label>
            <label className="block text-[14px] font-bold text-[#1F1A2E] space-y-1">O que a professora pediu (opcional)
              <textarea className={CAMPO} rows={3} value={nova.enunciado} onChange={(e) => setNova({ ...nova, enunciado: e.target.value })} maxLength={3000} placeholder="Copie aqui o enunciado, se tiver" />
            </label>
            {erro && <p className="rounded-2xl bg-[#FEF2F2] text-[#B91C1C] text-sm px-4 py-3">{erro}</p>}
            <button type="submit" disabled={criando} className="w-full rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[52px] disabled:opacity-60">{criando ? "Abrindo..." : "Começar"}</button>
          </form>
        )}

        {lista === null ? <Carregando /> : lista.length === 0 ? (
          <section className="flex items-end gap-3 rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(91,33,182,0.12)]">
            <RoboFlow tamanho={72} />
            <p className="flex-1 rounded-3xl rounded-bl-md bg-[#F5F3FF] border border-[#E9E5F5] px-4 py-3 text-[15px] font-bold text-[#1F1A2E]">
              Ainda não tem redação do professor para você. Quando ele abrir uma, ela aparece aqui. Você também pode trazer uma redação da escola.
            </p>
          </section>
        ) : lista.map((p) => {
          const s = SITUACAO[p.situacao] ?? SITUACAO.nova;
          return (
            <Link key={p.id} href={`/escola/aluno/redacao/${p.id}`} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)] active:scale-[0.99] transition-transform">
              <span className="w-12 h-12 rounded-2xl bg-[#6D28D9] text-white flex items-center justify-center shrink-0"><PenLine className="size-6" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-extrabold text-[#1F1A2E] leading-tight">{p.titulo}</span>
                <span className="block text-[13px] text-[#5B5470] mt-0.5">{p.propria ? "Trazida por você · " : ""}{p.genero}{p.prazo ? ` · até ${new Date(p.prazo).toLocaleDateString("pt-BR")}` : ""}</span>
                <span className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${s.cor}`}>{s.texto}</span>
              </span>
              <ChevronRight className="size-5 text-[#6D28D9] shrink-0" />
            </Link>
          );
        })}
      </main>
    </div>
  );
}

"use client";
/** Secretaria: liga o canal de apoio ao aluno, escolhe o ano e indica quem lê os pedidos. */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeartHandshake, ShieldCheck, Search, UserPlus, UserMinus, ChevronRight } from "lucide-react";

interface Pessoa { id: string; nome: string; email: string; funcao: string; naEquipe: boolean }
interface Estado { ativo: boolean; anoMinimo: number; anos: number[]; pessoas: Pessoa[] }

export default function ApoioDaRedePage() {
  const [dados, setDados] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/escola/rede/apoio", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setDados)
      .catch(() => setErro("Não foi possível carregar."));
  }, []);

  async function mudar(corpo: Record<string, unknown>) {
    setSalvando(true); setErro("");
    const r = await fetch("/api/escola/rede/apoio", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setSalvando(false);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível salvar."); return; }
    setDados(d);
  }

  const equipe = useMemo(() => dados?.pessoas.filter((p) => p.naEquipe) ?? [], [dados]);
  const outros = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (dados?.pessoas ?? []).filter((p) => !p.naEquipe && (!termo || `${p.nome} ${p.email} ${p.funcao}`.toLowerCase().includes(termo))).slice(0, 30);
  }, [dados, busca]);

  const cartao = "bg-white border border-[#E9E5F5] rounded-2xl p-4 sm:p-6";

  return (
    <div className="px-4 sm:px-7 py-6 sm:py-8 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0"><HeartHandshake size={22} /></span>
        <div className="min-w-0">
          <h1 className="text-[#1F1A2E] font-extrabold text-[22px] sm:text-2xl leading-tight">Apoio ao aluno</h1>
          <p className="text-[#5B5470] text-[14px] leading-snug mt-1">Um lugar reservado na tela do aluno para ele pedir ajuda ou contar algo que o preocupa. A plataforma é a ponte; o atendimento psicológico e social é da rede do município.</p>
        </div>
      </div>

      {erro && <p role="alert" className="text-[14px] font-semibold text-[#B91C1C]">{erro}</p>}
      {!dados ? (!erro && <p className="text-[#5B5470] text-center py-10">Carregando...</p>) : (
        <>
          <section className={cartao}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Canal de apoio</h2>
                <p className="text-[14px] text-[#5B5470] mt-0.5">{dados.ativo ? "Ligado: aparece no fim da tela inicial dos alunos." : "Desligado: os alunos não veem o canal."}</p>
              </div>
              <button role="switch" aria-checked={dados.ativo} aria-label="Ligar ou desligar o canal de apoio" disabled={salvando} onClick={() => mudar({ ativo: !dados.ativo })}
                className={`relative w-14 h-8 rounded-full shrink-0 transition-colors disabled:opacity-60 ${dados.ativo ? "bg-[#6D28D9]" : "bg-[#D4CFE3]"}`}>
                <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${dados.ativo ? "left-7" : "left-1"}`} />
              </button>
            </div>
            <p className="text-[13px] font-bold text-[#5B5470] mt-5 mb-2">Aparece para os alunos a partir do</p>
            <div className="flex flex-wrap gap-2">
              {dados.anos.map((a) => (
                <button key={a} disabled={salvando} onClick={() => mudar({ anoMinimo: a })} aria-pressed={dados.anoMinimo === a}
                  className={`min-h-[44px] px-4 rounded-xl text-[14px] font-bold border-[1.5px] disabled:opacity-60 ${dados.anoMinimo === a ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>
                  {a}º ano
                </button>
              ))}
            </div>
          </section>

          <section className={cartao}>
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[#1F1A2E]"><ShieldCheck size={18} className="text-[#6D28D9]" />Equipe que lê os pedidos</h2>
            <p className="text-[14px] text-[#5B5470] mt-1 leading-snug">Só as pessoas desta lista leem os pedidos e ouvem as gravações. Direção, professores e responsáveis não têm acesso. Indique poucas pessoas, preparadas para acolher o aluno.</p>

            {!equipe.length ? (
              <p className="mt-4 rounded-xl bg-[#FEF3C7] text-[#92400E] text-[14px] font-semibold px-3 py-2.5">Ninguém foi indicado ainda. Enquanto a equipe estiver vazia, os pedidos chegam e ficam guardados, mas ninguém lê.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[#F1EEF9] border border-[#EDE9F7] rounded-xl">
                {equipe.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-semibold text-[#1F1A2E] break-words">{p.nome}</span>
                      <span className="block text-[12px] text-[#5B5470] break-words">{p.funcao} · {p.email}</span>
                    </span>
                    <button disabled={salvando} onClick={() => mudar({ retirar: p.id })} className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-[#DDD6EE] text-[13px] font-bold text-[#B91C1C] shrink-0 disabled:opacity-60"><UserMinus size={15} />Retirar</button>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[13px] font-bold text-[#5B5470] mt-5 mb-2">Indicar uma pessoa da rede</p>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B84A0]" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail ou função" aria-label="Buscar pessoa"
                className="w-full h-12 rounded-xl border-[1.5px] border-[#DDD6EE] bg-white pl-9 pr-3 text-[16px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none" />
            </div>
            <ul className="mt-2 max-h-80 overflow-y-auto divide-y divide-[#F1EEF9] border border-[#EDE9F7] rounded-xl">
              {outros.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] text-[#1F1A2E] break-words">{p.nome}</span>
                    <span className="block text-[12px] text-[#5B5470] break-words">{p.funcao} · {p.email}</span>
                  </span>
                  <button disabled={salvando} onClick={() => mudar({ incluir: p.id })} className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-[#EDE9FE] text-[13px] font-bold text-[#5B21B6] shrink-0 disabled:opacity-60"><UserPlus size={15} />Indicar</button>
                </li>
              ))}
              {!outros.length && <li className="px-3 py-4 text-[14px] text-[#5B5470] text-center">Ninguém encontrado.</li>}
            </ul>
          </section>

          <Link href="/escola/apoio" className={cartao + " flex items-center gap-3 hover:border-[#C4B5FD]"}>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold text-[#1F1A2E]">Abrir os pedidos de apoio</span>
              <span className="block text-[13px] text-[#5B5470]">Só abre para quem está na equipe acima.</span>
            </span>
            <ChevronRight size={18} className="text-[#8B84A0] shrink-0" />
          </Link>
        </>
      )}
    </div>
  );
}

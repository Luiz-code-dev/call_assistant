"use client";
/**
 * Pedidos de apoio dos alunos, para a equipe que a secretaria indicou.
 * O conteúdo só aparece ao abrir cada pedido, e cada abertura fica registrada.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeartHandshake, ShieldCheck, Mic, FileText, ChevronDown, Inbox, Lock, Check, Scale } from "lucide-react";
import { ASSUNTO_PARA_A_EQUIPE, STATUS_APOIO, STATUS_PARA_A_EQUIPE, MAX_OBSERVACAO, type AssuntoApoio, type StatusApoio } from "@/lib/escola/apoio-aluno";

interface Linha { id: string; aluno: string; turma: string; escola: string; assunto: AssuntoApoio; status: StatusApoio; createdAt: string; visto: boolean; temTexto: boolean; temAudio: boolean }
interface Detalhe extends Omit<Linha, "visto" | "temTexto"> { texto: string | null; audioUrl: string | null; observacao: string; encaminhadoPara: string }
type Filtro = "novos" | "andamento" | "concluidos";

const COR: Record<StatusApoio, string> = {
  RECEBIDO: "bg-[#FEE2E2] text-[#991B1B]",
  EM_ACOMPANHAMENTO: "bg-[#FEF3C7] text-[#92400E]",
  ENCAMINHADO: "bg-[#DBEAFE] text-[#1D4ED8]",
  CONCLUIDO: "bg-[#DCFCE7] text-[#166534]",
};

function quando(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function PedidosDeApoioPage() {
  const [lista, setLista] = useState<Linha[]>([]);
  const [estado, setEstado] = useState<"carregando" | "ok" | "sem-acesso" | "erro">("carregando");
  const [filtro, setFiltro] = useState<Filtro>("novos");
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [observacao, setObservacao] = useState("");
  const [encaminhado, setEncaminhado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(() => {
    fetch("/api/escola/apoio/pedidos", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404 || r.status === 403) { setEstado("sem-acesso"); return; }
        if (!r.ok) { setEstado("erro"); return; }
        const d = await r.json();
        setLista(d.pedidos ?? []); setEstado("ok");
      })
      .catch(() => setEstado("erro"));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const grupos = useMemo(() => ({
    novos: lista.filter((p) => p.status === "RECEBIDO"),
    andamento: lista.filter((p) => p.status === "EM_ACOMPANHAMENTO" || p.status === "ENCAMINHADO"),
    concluidos: lista.filter((p) => p.status === "CONCLUIDO"),
  }), [lista]);

  async function abrir(id: string) {
    if (abertoId === id) { setAbertoId(null); setDetalhe(null); return; }
    setAbertoId(id); setDetalhe(null); setAviso("");
    const r = await fetch(`/api/escola/apoio/pedidos/${id}`, { cache: "no-store" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok || !d?.pedido) { setAviso("Não foi possível abrir este pedido."); return; }
    setDetalhe(d.pedido); setObservacao(d.pedido.observacao); setEncaminhado(d.pedido.encaminhadoPara);
    setLista((l) => l.map((p) => (p.id === id ? { ...p, visto: true } : p)));
  }

  async function salvar(id: string, status?: StatusApoio) {
    setSalvando(true); setAviso("");
    const r = await fetch(`/api/escola/apoio/pedidos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(status ? { status } : {}), observacao, encaminhadoPara: encaminhado }),
    }).catch(() => null);
    setSalvando(false);
    if (!r?.ok) { setAviso("Não foi possível salvar."); return; }
    setAviso("Salvo.");
    if (status) { setLista((l) => l.map((p) => (p.id === id ? { ...p, status } : p))); setDetalhe((d) => (d ? { ...d, status } : d)); }
  }

  const abas: { id: Filtro; nome: string }[] = [{ id: "novos", nome: "Novos" }, { id: "andamento", nome: "Em andamento" }, { id: "concluidos", nome: "Concluídos" }];
  const visiveis = grupos[filtro];
  const campo = "w-full rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 py-2.5 text-[15px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none";

  if (estado === "sem-acesso") {
    return (
      <div className="px-4 sm:px-7 py-8 max-w-xl mx-auto">
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-8 text-center">
          <Lock className="mx-auto text-[#C4B5FD] mb-3" size={40} />
          <p className="text-[#1F1A2E] font-semibold">Esta área é só da equipe de apoio ao aluno.</p>
          <p className="text-[#5B5470] text-[14px] mt-1">Quem indica as pessoas da equipe é a Secretaria de Educação.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-7 py-6 sm:py-8 max-w-3xl mx-auto">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0"><HeartHandshake size={22} /></span>
        <div className="min-w-0">
          <h1 className="text-[#1F1A2E] font-extrabold text-[22px] sm:text-2xl leading-tight">Pedidos de apoio dos alunos</h1>
          <p className="text-[#5B5470] text-[14px] leading-snug mt-1">Alunos que pediram para conversar ou contaram algo que os preocupa. Só a equipe indicada pela Secretaria vê esta tela.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] p-4 text-[14px] text-[#3B3550] leading-relaxed space-y-1.5">
        <p className="flex items-center gap-2 font-extrabold text-[#4C1D95]"><ShieldCheck size={16} className="shrink-0" />Antes de agir</p>
        <p>Procure o aluno pessoalmente, em lugar reservado. Escute sem pressionar e não peça que ele repita o relato para várias pessoas.</p>
        <p>Não avise a família antes de avaliar o risco: quem causa o sofrimento pode estar em casa.</p>
        <p className="flex items-start gap-2"><Scale size={15} className="shrink-0 mt-0.5 text-[#4C1D95]" /><span>Suspeita ou confirmação de maus-tratos deve ser comunicada ao Conselho Tutelar (Estatuto da Criança e do Adolescente, art. 13). O atendimento psicológico e social é da rede do município.</span></p>
        <p>Cada vez que um pedido é aberto, fica registrado quem abriu e quando.</p>
      </div>

      <div role="tablist" aria-label="Pedidos" className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-[#EFEDF5] p-1">
        {abas.map((a) => (
          <button key={a.id} role="tab" aria-selected={filtro === a.id} onClick={() => { setFiltro(a.id); setAbertoId(null); setDetalhe(null); }}
            className={`min-h-[52px] rounded-xl px-1 text-[13px] font-bold leading-tight ${filtro === a.id ? "bg-white text-[#6D28D9] shadow-sm" : "text-[#5B5470]"}`}>
            <span className="block text-[18px] font-extrabold">{estado === "ok" ? grupos[a.id].length : "-"}</span>{a.nome}
          </button>
        ))}
      </div>

      {estado === "carregando" && <p className="text-[#5B5470] text-center py-10">Carregando...</p>}
      {estado === "erro" && <p role="alert" className="text-[#B91C1C] text-sm mt-5">Não foi possível carregar os pedidos.</p>}
      {estado === "ok" && !visiveis.length && (
        <div className="mt-5 bg-white border border-[#E9E5F5] rounded-2xl p-8 text-center">
          <Inbox className="mx-auto text-[#C4B5FD] mb-3" size={40} />
          <p className="text-[#1F1A2E] font-semibold">{filtro === "novos" ? "Nenhum pedido novo." : filtro === "andamento" ? "Nenhum pedido em andamento." : "Nenhum pedido concluído."}</p>
        </div>
      )}

      {estado === "ok" && !!visiveis.length && (
        <ul className="mt-5 space-y-3">
          {visiveis.map((p) => {
            const aberto = abertoId === p.id;
            return (
              <li key={p.id} className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
                <button onClick={() => abrir(p.id)} aria-expanded={aberto} className="w-full text-left p-4 flex items-start gap-3">
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-[#1F1A2E] break-words">{p.aluno}</span>
                      {!p.visto && <span className="text-[11px] font-bold bg-[#6D28D9] text-white rounded-full px-2 py-0.5">Não lido</span>}
                    </span>
                    <span className="block text-[13px] text-[#5B5470] break-words">{[p.turma, p.escola].filter(Boolean).join(" · ")}</span>
                    <span className="block text-[14px] text-[#3B3550] mt-1.5 break-words">{ASSUNTO_PARA_A_EQUIPE[p.assunto] ?? "Pedido de apoio"}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                      <span className={`text-[12px] font-bold rounded-full px-2.5 py-1 ${COR[p.status]}`}>{STATUS_PARA_A_EQUIPE[p.status]}</span>
                      <span className="text-[12px] text-[#5B5470]">{quando(p.createdAt)}</span>
                      {p.temTexto && <span className="inline-flex items-center gap-1 text-[12px] text-[#5B5470]"><FileText size={13} />escreveu</span>}
                      {p.temAudio && <span className="inline-flex items-center gap-1 text-[12px] text-[#5B5470]"><Mic size={13} />gravou</span>}
                    </span>
                  </span>
                  <ChevronDown size={18} className={`text-[#8B84A0] shrink-0 mt-1 transition-transform ${aberto ? "rotate-180" : ""}`} />
                </button>

                {aberto && (
                  <div className="border-t border-[#F1EEF9] p-4 space-y-4 bg-[#FBFAFF]">
                    {!detalhe ? <p className="text-[14px] text-[#5B5470]">{aviso || "Abrindo..."}</p> : (
                      <>
                        <div>
                          <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#5B5470]">O que o aluno contou</p>
                          {detalhe.texto ? <p className="mt-1 text-[15px] text-[#1F1A2E] leading-relaxed whitespace-pre-wrap break-words bg-white border border-[#E9E5F5] rounded-xl p-3">{detalhe.texto}</p>
                            : <p className="mt-1 text-[14px] text-[#5B5470]">O aluno não escreveu. {detalhe.temAudio ? "Ouça a gravação." : "Ele só escolheu o assunto."}</p>}
                          {detalhe.temAudio && (detalhe.audioUrl
                            ? <audio controls src={detalhe.audioUrl} className="w-full mt-3" />
                            : <p className="mt-2 text-[14px] text-[#92400E]">A gravação não pôde ser carregada agora. Tente abrir de novo.</p>)}
                        </div>

                        <div>
                          <label htmlFor={`enc-${p.id}`} className="block text-[13px] font-bold text-[#5B5470] mb-1">Encaminhado para (se houver)</label>
                          <input id={`enc-${p.id}`} value={encaminhado} onChange={(e) => setEncaminhado(e.target.value.slice(0, 200))} placeholder="Ex.: Conselho Tutelar, CRAS, psicólogo da rede" className={campo} />
                        </div>
                        <div>
                          <label htmlFor={`obs-${p.id}`} className="block text-[13px] font-bold text-[#5B5470] mb-1">Registro da equipe (o aluno e a família não veem)</label>
                          <textarea id={`obs-${p.id}`} value={observacao} onChange={(e) => setObservacao(e.target.value.slice(0, MAX_OBSERVACAO))} rows={3} className={campo + " resize-none"} />
                        </div>

                        <div>
                          <p className="text-[13px] font-bold text-[#5B5470] mb-2">Situação</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {STATUS_APOIO.map((s) => (
                              <button key={s} onClick={() => salvar(p.id, s)} disabled={salvando} aria-pressed={detalhe.status === s}
                                className={`min-h-[44px] rounded-xl px-3 text-[14px] font-bold border-[1.5px] inline-flex items-center justify-center gap-1.5 disabled:opacity-60 ${detalhe.status === s ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>
                                {detalhe.status === s && <Check size={15} strokeWidth={3} />}{STATUS_PARA_A_EQUIPE[s]}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => salvar(p.id)} disabled={salvando} className="min-h-[44px] px-5 rounded-xl border-[1.5px] border-[#6D28D9] text-[#6D28D9] text-[14px] font-bold disabled:opacity-60">{salvando ? "Salvando..." : "Salvar registro"}</button>
                          {aviso && <span role="status" className="text-[14px] text-[#5B5470]">{aviso}</span>}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

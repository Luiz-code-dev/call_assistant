"use client";
/**
 * Pedidos de apoio dos alunos, para a equipe que a secretaria indicou.
 * O conteúdo só aparece ao abrir cada pedido, e cada abertura fica registrada.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HeartHandshake, ShieldCheck, Mic, FileText, ChevronDown, Inbox, Lock, Check, Scale, ListChecks, BarChart3, Megaphone, UserRoundCheck, FileOutput } from "lucide-react";
import {
  ASSUNTO_PARA_A_EQUIPE, ASSUNTOS_APOIO, STATUS_APOIO, STATUS_PARA_A_EQUIPE, MAX_OBSERVACAO, ORIENTACAO, ORIENTACAO_NAO_PROCEDE,
  ORGAOS, ROTULO_ORGAO, DESFECHOS, ROTULO_DESFECHO, ROTULO_FUNCAO, type AssuntoApoio, type StatusApoio, type Orgao, type Desfecho, type FuncaoApoio,
} from "@/lib/escola/apoio-aluno";

interface Linha { id: string; aluno: string; turma: string; escola: string; assunto: AssuntoApoio; status: StatusApoio; desfecho: Desfecho | null; comunicado: boolean; createdAt: string; visto: boolean; temTexto: boolean; temAudio: boolean }
interface Pessoa { id: string; nome: string; funcao: FuncaoApoio }
interface Detalhe extends Omit<Linha, "visto" | "temTexto" | "comunicado"> { texto: string | null; audioUrl: string | null; observacao: string; encaminhadoPara: string; comunicadoA: Orgao[]; responsavel: { id: string; nome: string } | null }
interface Serie { periodo: string; total: number }
interface Numeros {
  total: number; porStatus: Record<string, number>; porAssunto: Record<string, number>; porDesfecho: Record<string, number>;
  comunicados: number; porOrgao: Record<string, number>; horasAteLeitura: number | null; horasAteConclusao: number | null;
  porDia: Serie[]; porSemana: Serie[]; porMes: Serie[]; porAno: Serie[]; redeToda: boolean;
}
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
  const [erroAoSalvar, setErroAoSalvar] = useState("");
  const [colegas, setColegas] = useState<Pessoa[]>([]);
  const [euId, setEuId] = useState("");
  const [passarPara, setPassarPara] = useState("");
  // Pedido aberto agora. Respostas que chegam de outro pedido não mexem na tela.
  const abertoAgora = useRef<string | null>(null);
  useEffect(() => { abertoAgora.current = abertoId; }, [abertoId]);
  const [visao, setVisao] = useState<"pedidos" | "indicadores">("pedidos");
  const [orgaos, setOrgaos] = useState<Orgao[]>([]);
  const [concluindo, setConcluindo] = useState(false);
  const [numeros, setNumeros] = useState<Numeros | null>(null);
  const [periodo, setPeriodo] = useState<"porDia" | "porSemana" | "porMes" | "porAno">("porSemana");

  useEffect(() => {
    if (visao !== "indicadores") return;
    fetch("/api/escola/apoio/indicadores", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNumeros(d))
      .catch(() => {});
  }, [visao]);

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
    if (abertoId === id) { abertoAgora.current = null; setAbertoId(null); setDetalhe(null); return; }
    setAbertoId(id); setDetalhe(null); setAviso(""); setErroAoSalvar(""); setConcluindo(false);
    abertoAgora.current = id;
    const r = await fetch(`/api/escola/apoio/pedidos/${id}`, { cache: "no-store" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (abertoAgora.current !== id) return;
    if (!r?.ok || !d?.pedido) { setAviso("Não foi possível abrir este pedido."); return; }
    setDetalhe(d.pedido); setObservacao(d.pedido.observacao); setEncaminhado(d.pedido.encaminhadoPara); setOrgaos(d.pedido.comunicadoA ?? []);
    setColegas(d.colegas ?? []); setEuId(d.eu?.id ?? ""); setPassarPara("");
    setLista((l) => l.map((p) => (p.id === id ? { ...p, visto: true } : p)));
  }

  async function salvar(id: string, status?: StatusApoio, desfecho?: Desfecho) {
    // Só salva o pedido que está aberto, e guarda o que foi enviado: a tela pode mudar enquanto a resposta não chega
    if (!detalhe || detalhe.id !== id) return;
    const enviado = { orgaos: [...orgaos], anterior: detalhe.status, desfechoAnterior: detalhe.desfecho };
    setSalvando(true); setAviso(""); setErroAoSalvar("");
    const r = await fetch(`/api/escola/apoio/pedidos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(status ? { status } : {}), ...(desfecho ? { desfecho } : {}), observacao, encaminhadoPara: encaminhado, comunicadoA: enviado.orgaos }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setSalvando(false);
    const aindaAberto = abertoAgora.current === id;
    if (!r?.ok) { if (aindaAberto) setErroAoSalvar(d?.error ?? "Não foi possível salvar. Tente de novo."); return; }
    // A situação vem do servidor: registrar uma providência em pedido novo já o tira de "novo"
    const nova: StatusApoio = (d?.status as StatusApoio) ?? status ?? enviado.anterior;
    const fim = nova === "CONCLUIDO" ? desfecho ?? enviado.desfechoAnterior ?? null : null;
    // A linha da lista é sempre a do pedido salvo
    setLista((l) => l.map((p) => (p.id === id ? { ...p, comunicado: enviado.orgaos.length > 0, status: nova, desfecho: fim } : p)));
    // O menu atualiza o contador de pedidos novos
    window.dispatchEvent(new Event("sf-apoio-mudou"));
    // Detalhe, aba e confirmação só mudam se o pedido salvo ainda é o que está aberto
    if (!aindaAberto) return;
    setConcluindo(false);
    setDetalhe((x) => (x && x.id === id ? { ...x, status: nova, desfecho: fim, comunicadoA: enviado.orgaos } : x));
    setFiltro(nova === "RECEBIDO" ? "novos" : nova === "CONCLUIDO" ? "concluidos" : "andamento");
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setAviso(nova !== enviado.anterior ? `Salvo às ${hora}. O pedido agora está em: ${STATUS_PARA_A_EQUIPE[nova]}.` : `Registro salvo às ${hora}.`);
  }

  /** Passa o caso para um colega da equipe; ele é avisado por e-mail, sem nome nem conteúdo. */
  async function passar(id: string) {
    if (!passarPara || !detalhe || detalhe.id !== id) return;
    const destino = colegas.find((c) => c.id === passarPara);
    setSalvando(true); setAviso(""); setErroAoSalvar("");
    const r = await fetch(`/api/escola/apoio/pedidos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passarPara }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setSalvando(false);
    const aindaAberto = abertoAgora.current === id;
    if (!r?.ok) { if (aindaAberto) setErroAoSalvar(d?.error ?? "Não foi possível passar o caso."); return; }
    const nova: StatusApoio = (d?.status as StatusApoio) ?? detalhe.status;
    setLista((l) => l.map((p) => (p.id === id ? { ...p, status: nova } : p)));
    window.dispatchEvent(new Event("sf-apoio-mudou"));
    if (!aindaAberto) return;
    setDetalhe((x) => (x && x.id === id ? { ...x, status: nova, responsavel: destino ? { id: destino.id, nome: destino.nome } : x.responsavel } : x));
    setFiltro(nova === "RECEBIDO" ? "novos" : nova === "CONCLUIDO" ? "concluidos" : "andamento");
    setPassarPara("");
    setAviso(destino && destino.id !== euId ? `Caso passado para ${destino.nome}, que foi avisado por e-mail.` : "Você ficou como responsável por este caso.");
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

      <div className="mt-5 grid grid-cols-2 gap-2">
        {([["pedidos", "Pedidos", ListChecks], ["indicadores", "Indicadores", BarChart3]] as const).map(([id, nome, Icone]) => (
          <button key={id} onClick={() => setVisao(id)} aria-pressed={visao === id}
            className={`min-h-[48px] rounded-xl text-[14px] font-bold inline-flex items-center justify-center gap-2 border-[1.5px] ${visao === id ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>
            <Icone size={16} />{nome}
          </button>
        ))}
      </div>

      {visao === "indicadores" ? (
        !numeros ? <p className="text-[#5B5470] text-center py-10">Carregando...</p> : <PainelDeNumeros n={numeros} periodo={periodo} setPeriodo={setPeriodo} />
      ) : (
        <>
      <div role="tablist" aria-label="Pedidos" className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-[#EFEDF5] p-1">
        {abas.map((a) => (
          <button key={a.id} role="tab" aria-selected={filtro === a.id} onClick={() => { abertoAgora.current = null; setFiltro(a.id); setAbertoId(null); setDetalhe(null); }}
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
{p.comunicado && <span className="text-[12px] font-bold rounded-full px-2.5 py-1 bg-[#DBEAFE] text-[#1D4ED8]">Órgão comunicado</span>}
                      {p.status === "CONCLUIDO" && p.desfecho === "NAO_PROCEDE" && <span className="text-[12px] font-bold rounded-full px-2.5 py-1 bg-[#F1EEF9] text-[#5B5470]">Não procede</span>}
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
                        <div className="rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] p-3">
                          <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#4C1D95]"><ListChecks size={15} className="shrink-0" />{ORIENTACAO[detalhe.assunto]?.titulo ?? "Orientação"}</p>
                          <ol className="mt-1.5 space-y-1 text-[14px] text-[#3B3550] leading-snug list-decimal pl-5">
                            {(ORIENTACAO[detalhe.assunto]?.passos ?? []).map((t) => <li key={t}>{t}</li>)}
                          </ol>
                        </div>

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

                        <div className="rounded-xl border border-[#E9E5F5] bg-white p-3">
                          <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#5B5470]"><UserRoundCheck size={14} />Quem cuida deste caso</p>
                          <p className="text-[15px] font-semibold text-[#1F1A2E] mt-1 break-words">{detalhe.responsavel ? detalhe.responsavel.nome : "Ninguém assumiu ainda"}</p>
                          <div className="mt-2 flex flex-col sm:flex-row gap-2">
                            <select value={passarPara} onChange={(e) => setPassarPara(e.target.value)} aria-label="Passar o caso para" className={campo + " sm:flex-1 h-12 py-0"}>
                              <option value="">Passar o caso para...</option>
                              {colegas.filter((c) => c.id !== detalhe.responsavel?.id).map((c) => (
                                <option key={c.id} value={c.id}>{c.id === euId ? "Eu mesmo(a)" : c.nome} · {ROTULO_FUNCAO[c.funcao] ?? "Equipe"}</option>
                              ))}
                            </select>
                            <button onClick={() => passar(p.id)} disabled={!passarPara || salvando} className="min-h-[48px] px-5 rounded-xl border-[1.5px] border-[#6D28D9] text-[#6D28D9] text-[14px] font-bold disabled:opacity-50">Passar</button>
                          </div>
                          <p className="text-[12px] text-[#8B84A0] mt-1.5">Aparecem só as pessoas da equipe que atendem a escola deste aluno.</p>
                        </div>

                        <Link href={`/escola/apoio/${p.id}/encaminhamento`} className="flex items-center gap-3 rounded-xl border border-[#E9E5F5] bg-white p-3 hover:border-[#C4B5FD]">
                          <FileOutput size={18} className="text-[#6D28D9] shrink-0" />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14px] font-bold text-[#1F1A2E]">Gerar documento de encaminhamento</span>
                            <span className="block text-[12px] text-[#5B5470]">Para entregar ao Conselho Tutelar ou a outro órgão, pelo canal oficial.</span>
                          </span>
                        </Link>

                        <div>
                          <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#5B5470] mb-2"><Megaphone size={14} />Órgãos já comunicados</p>
                          <div className="space-y-1.5">
                            {ORGAOS.map((o) => {
                              const on = orgaos.includes(o);
                              return (
                                <button key={o} onClick={() => setOrgaos((l) => (on ? l.filter((x) => x !== o) : [...l, o]))} aria-pressed={on}
                                  className={`w-full min-h-[44px] rounded-xl px-3 text-left text-[14px] flex items-center gap-2.5 border-[1.5px] ${on ? "bg-[#DBEAFE] border-[#1D4ED8] text-[#1E3A8A] font-bold" : "bg-white border-[#DDD6EE] text-[#1F1A2E]"}`}>
                                  <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${on ? "bg-[#1D4ED8] border-[#1D4ED8]" : "border-[#C4B5FD]"}`}>{on && <Check size={13} className="text-white" strokeWidth={3} />}</span>
                                  <span className="min-w-0 break-words">{ROTULO_ORGAO[o]}</span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[12px] text-[#8B84A0] mt-1.5">Marque e toque em &quot;Salvar registro&quot;. O pedido sai de &quot;Novo&quot; e a data da primeira comunicação fica guardada.</p>
                        </div>

                        <div>
                          <p className="text-[13px] font-bold text-[#5B5470] mb-2">Situação</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {STATUS_APOIO.map((st) => (
                              <button key={st} onClick={() => (st === "CONCLUIDO" ? setConcluindo(true) : salvar(p.id, st))} disabled={salvando} aria-pressed={detalhe.status === st}
                                className={`min-h-[44px] rounded-xl px-3 text-[14px] font-bold border-[1.5px] inline-flex items-center justify-center gap-1.5 disabled:opacity-60 ${detalhe.status === st ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>
                                {detalhe.status === st && <Check size={15} strokeWidth={3} />}{STATUS_PARA_A_EQUIPE[st]}
                              </button>
                            ))}
                          </div>
                          {detalhe.status === "CONCLUIDO" && detalhe.desfecho && !concluindo && <p className="text-[13px] text-[#5B5470] mt-2">Concluído como: <b className="text-[#1F1A2E]">{ROTULO_DESFECHO[detalhe.desfecho]}</b></p>}
                          {concluindo && (
                            <div className="mt-3 rounded-xl border border-[#DDD6EE] bg-white p-3 space-y-2">
                              <p className="text-[14px] font-bold text-[#1F1A2E]">Como este pedido foi concluído?</p>
                              <button onClick={() => salvar(p.id, "CONCLUIDO", "ATENDIDO")} disabled={salvando} className="w-full min-h-[44px] rounded-xl bg-[#166534] text-white text-[14px] font-bold disabled:opacity-60">{ROTULO_DESFECHO.ATENDIDO}</button>
                              <div className="rounded-xl bg-[#FFF7E0] p-3">
                                <ul className="space-y-1 text-[13px] text-[#3B3550] leading-snug">{ORIENTACAO_NAO_PROCEDE.map((t) => <li key={t}>{t}</li>)}</ul>
                                <button onClick={() => salvar(p.id, "CONCLUIDO", "NAO_PROCEDE")} disabled={salvando} className="mt-2 w-full min-h-[44px] rounded-xl border-[1.5px] border-[#92400E] text-[#92400E] text-[14px] font-bold disabled:opacity-60">{ROTULO_DESFECHO.NAO_PROCEDE}</button>
                              </div>
                              <button onClick={() => setConcluindo(false)} className="w-full min-h-[40px] text-[14px] font-semibold text-[#5B5470]">Cancelar</button>
                            </div>
                          )}
                        </div>
                        <button onClick={() => salvar(p.id)} disabled={salvando} className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-[#6D28D9] text-white text-[14px] font-bold disabled:opacity-60">{salvando ? "Salvando..." : "Salvar registro"}</button>
                        {aviso && <p role="status" className="flex items-start gap-2 rounded-xl bg-[#DCFCE7] text-[#166534] text-[14px] font-semibold px-3 py-2.5"><Check size={16} strokeWidth={3} className="shrink-0 mt-0.5" />{aviso}</p>}
                        {erroAoSalvar && <p role="alert" className="rounded-xl bg-[#FEE2E2] text-[#991B1B] text-[14px] font-semibold px-3 py-2.5">{erroAoSalvar}</p>}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
        </>
      )}
    </div>
  );
}

const NOME_PERIODO = { porDia: "Dia", porSemana: "Semana", porMes: "Mês", porAno: "Ano" } as const;
type Periodo = keyof typeof NOME_PERIODO;

function rotuloDoPeriodo(tipo: Periodo, chave: string): string {
  if (tipo === "porAno") return chave;
  const [ano, mes, dia] = chave.split("-");
  if (tipo === "porMes") return `${mes}/${ano.slice(2)}`;
  return `${dia}/${mes}`;
}
function horas(h: number | null): string {
  if (h === null) return "-";
  if (h < 1) return "menos de 1 hora";
  if (h < 48) return `${Math.round(h)} ${Math.round(h) === 1 ? "hora" : "horas"}`;
  return `${Math.round(h / 24)} dias`;
}

function Barras({ itens }: { itens: { nome: string; total: number }[] }) {
  const maior = Math.max(1, ...itens.map((i) => i.total));
  return (
    <ul className="space-y-2">
      {itens.map((i) => (
        <li key={i.nome}>
          <div className="flex items-baseline justify-between gap-3 text-[14px]"><span className="text-[#1F1A2E] min-w-0 break-words">{i.nome}</span><b className="text-[#1F1A2E] shrink-0">{i.total}</b></div>
          <div className="h-2 rounded-full bg-[#F1EEF9] mt-1"><div className="h-2 rounded-full bg-[#6D28D9]" style={{ width: `${(i.total / maior) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function PainelDeNumeros({ n, periodo, setPeriodo }: { n: Numeros; periodo: Periodo; setPeriodo: (p: Periodo) => void }) {
  const cartao = "bg-white border border-[#E9E5F5] rounded-2xl p-4";
  const serie = n[periodo];
  const maior = Math.max(1, ...serie.map((x) => x.total));
  const emAndamento = (n.porStatus.EM_ACOMPANHAMENTO ?? 0) + (n.porStatus.ENCAMINHADO ?? 0);
  const numerosDoTopo = [
    { nome: "Pedidos recebidos", valor: n.total },
    { nome: "Novos, sem tratar", valor: n.porStatus.RECEBIDO ?? 0 },
    { nome: "Em andamento", valor: emAndamento },
    { nome: "Concluídos", valor: n.porStatus.CONCLUIDO ?? 0 },
    { nome: "Comunicados a órgãos", valor: n.comunicados },
    { nome: "Não procedem", valor: n.porDesfecho.NAO_PROCEDE ?? 0 },
  ];
  return (
    <div className="mt-5 space-y-4">
      <p className="text-[13px] text-[#5B5470]">{n.redeToda ? "Números de toda a rede." : "Números das escolas que você atende."} Só contagens: nenhum nome de aluno aparece aqui.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {numerosDoTopo.map((x) => (
          <div key={x.nome} className={cartao}>
            <p className="text-[26px] font-extrabold text-[#1F1A2E] leading-none">{x.valor}</p>
            <p className="text-[13px] text-[#5B5470] mt-1.5 leading-snug">{x.nome}</p>
          </div>
        ))}
      </div>

      <section className={cartao}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-extrabold text-[#1F1A2E]">Pedidos por período</h2>
          <div className="flex gap-1 rounded-xl bg-[#EFEDF5] p-1">
            {(Object.keys(NOME_PERIODO) as Periodo[]).map((p) => (
              <button key={p} onClick={() => setPeriodo(p)} aria-pressed={periodo === p}
                className={`min-h-[36px] px-3 rounded-lg text-[13px] font-bold ${periodo === p ? "bg-white text-[#6D28D9] shadow-sm" : "text-[#5B5470]"}`}>{NOME_PERIODO[p]}</button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-end gap-1 h-40" role="img" aria-label={`Pedidos por ${NOME_PERIODO[periodo].toLowerCase()}`}>
          {serie.map((x) => (
            <div key={x.periodo} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
              <span className="text-[11px] font-bold text-[#1F1A2E]">{x.total || ""}</span>
              <div className="w-full rounded-t-md bg-[#6D28D9]" style={{ height: `${(x.total / maior) * 100}%`, minHeight: x.total ? 4 : 1, opacity: x.total ? 1 : 0.2 }} />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {serie.map((x, i) => (
            <span key={x.periodo} className="flex-1 min-w-0 text-center text-[10px] text-[#5B5470] truncate">{serie.length > 8 && i % 2 === 1 ? "" : rotuloDoPeriodo(periodo, x.periodo)}</span>
          ))}
        </div>
        {periodo === "porSemana" && <p className="text-[12px] text-[#8B84A0] mt-2">Cada barra é uma semana; a data é a segunda-feira.</p>}
      </section>

      <section className={cartao}>
        <h2 className="text-[15px] font-extrabold text-[#1F1A2E] mb-3">Tipos de pedido</h2>
        <Barras itens={ASSUNTOS_APOIO.map((a) => ({ nome: ASSUNTO_PARA_A_EQUIPE[a], total: n.porAssunto[a] ?? 0 }))} />
      </section>
      <section className={cartao}>
        <h2 className="text-[15px] font-extrabold text-[#1F1A2E] mb-3">Situação dos pedidos</h2>
        <Barras itens={STATUS_APOIO.map((st) => ({ nome: STATUS_PARA_A_EQUIPE[st], total: n.porStatus[st] ?? 0 }))} />
      </section>
      <section className={cartao}>
        <h2 className="text-[15px] font-extrabold text-[#1F1A2E] mb-3">Como os concluídos terminaram</h2>
        <Barras itens={DESFECHOS.map((d) => ({ nome: ROTULO_DESFECHO[d], total: n.porDesfecho[d] ?? 0 }))} />
      </section>
      <section className={cartao}>
        <h2 className="text-[15px] font-extrabold text-[#1F1A2E] mb-3">Órgãos comunicados</h2>
        <Barras itens={ORGAOS.map((o) => ({ nome: ROTULO_ORGAO[o], total: n.porOrgao[o] ?? 0 }))} />
      </section>
      <section className={cartao + " grid grid-cols-1 sm:grid-cols-2 gap-4"}>
        <div><p className="text-[13px] text-[#5B5470]">Tempo médio até alguém ler</p><p className="text-[20px] font-extrabold text-[#1F1A2E]">{horas(n.horasAteLeitura)}</p></div>
        <div><p className="text-[13px] text-[#5B5470]">Tempo médio até concluir</p><p className="text-[20px] font-extrabold text-[#1F1A2E]">{horas(n.horasAteConclusao)}</p></div>
      </section>
    </div>
  );
}

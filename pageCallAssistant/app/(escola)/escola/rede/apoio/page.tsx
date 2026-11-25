"use client";
/** Secretaria: liga o canal de apoio ao aluno, escolhe o ano e indica quem lê os pedidos. */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeartHandshake, ShieldCheck, Search, UserPlus, UserMinus, ChevronRight, Check, Pencil, BadgeCheck, Trash2, Send } from "lucide-react";
import { FUNCOES_APOIO, ROTULO_FUNCAO, type FuncaoApoio } from "@/lib/escola/apoio-aluno";
import { CONSELHO, FUNCOES_REGISTRADAS, UFS, type FuncaoRegistrada } from "@/lib/escola/apoio-profissional";

interface Pessoa { id: string; nome: string; email: string; funcao: string; naEquipe: boolean; funcaoNoApoio: FuncaoApoio | null; schoolIds: string[] }
interface Escola { id: string; name: string }
interface Cadastro {
  id: string; name: string; email: string; funcao: FuncaoRegistrada; conselho: string; registro: string; uf: string; schoolIds: string[];
  verificacao: string; situacaoNoConselho: string | null; status: "CONVIDADO" | "ATIVO" | "RECUSOU"; createdAt: string;
}
const SITUACAO_DO_CADASTRO: Record<Cadastro["status"], { rotulo: string; cor: string }> = {
  CONVIDADO: { rotulo: "Aguardando o aceite", cor: "bg-[#FEF3C7] text-[#92400E]" },
  ATIVO: { rotulo: "Ativo", cor: "bg-[#DCFCE7] text-[#166534]" },
  RECUSOU: { rotulo: "Recusou e pediu a exclusão", cor: "bg-[#FEE2E2] text-[#991B1B]" },
};
const FORM_VAZIO = { nome: "", email: "", funcao: "ASSISTENTE_SOCIAL" as FuncaoRegistrada, registro: "", uf: "BA", todas: true, escolas: [] as string[], declaro: false };

interface Estado { ativo: boolean; anoMinimo: number; anos: number[]; escolas: Escola[]; pessoas: Pessoa[] }

export default function ApoioDaRedePage() {
  const [dados, setDados] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  // Pessoa que está sendo indicada ou alterada, com a função e as escolas escolhidas
  const [ficha, setFicha] = useState<{ pessoa: Pessoa; funcao: FuncaoApoio; todas: boolean; escolas: string[] } | null>(null);

  function abrirFicha(p: Pessoa) {
    setFicha({ pessoa: p, funcao: p.funcaoNoApoio ?? "INDICADO", todas: !p.schoolIds.length, escolas: p.schoolIds });
  }
  async function confirmarFicha() {
    if (!ficha) return;
    if (!ficha.todas && !ficha.escolas.length) { setErro("Escolha pelo menos uma escola ou marque a rede toda."); return; }
    const ok = await mudar({ incluir: ficha.pessoa.id, funcao: ficha.funcao, schoolIds: ficha.todas ? [] : ficha.escolas });
    if (ok) setFicha(null);
  }

  // Cadastro de assistente social e psicólogo
  const [cadastros, setCadastros] = useState<Cadastro[]>([]);
  const [consultaAutomatica, setConsultaAutomatica] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [cadastrando, setCadastrando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState("");
  const [avisoCadastro, setAvisoCadastro] = useState("");

  useEffect(() => {
    fetch("/api/escola/rede/apoio/profissionais", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setCadastros(d.cadastros ?? []); setConsultaAutomatica(!!d.consultaAutomatica); } })
      .catch(() => {});
  }, []);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErroCadastro(""); setAvisoCadastro("");
    if (!form.todas && !form.escolas.length) { setErroCadastro("Escolha pelo menos uma escola ou marque a rede toda."); return; }
    setCadastrando(true);
    const r = await fetch("/api/escola/rede/apoio/profissionais", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: form.nome, email: form.email, funcao: form.funcao, registro: form.registro, uf: form.uf, schoolIds: form.todas ? [] : form.escolas, declaro: form.declaro }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setCadastrando(false);
    if (!r?.ok) { setErroCadastro(d?.error ?? "Não foi possível cadastrar."); return; }
    setCadastros(d.cadastros ?? []);
    const conferido = d.verificacao === "CONSULTADO" ? "O registro foi confirmado no conselho. " : "";
    setAvisoCadastro(conferido + (d.enviado ? `O convite foi enviado para ${form.email}.` : "Cadastro feito, mas o e-mail não pôde ser enviado agora. Cadastre de novo mais tarde para reenviar."));
    setForm(FORM_VAZIO);
  }

  async function excluirCadastro(c: Cadastro) {
    setErroCadastro(""); setAvisoCadastro("");
    const r = await fetch(`/api/escola/rede/apoio/profissionais?id=${encodeURIComponent(c.id)}`, { method: "DELETE" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { setErroCadastro(d?.error ?? "Não foi possível excluir."); return; }
    setCadastros(d.cadastros ?? []);
    setAvisoCadastro(`O cadastro de ${c.name} foi excluído.`);
    // A lista da equipe muda quando o profissional já estava ativo
    fetch("/api/escola/rede/apoio", { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).then((x) => { if (x) setDados(x); }).catch(() => {});
  }

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
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível salvar."); return false; }
    setDados(d);
    return true;
  }
  const nomeDasEscolas = (ids: string[]) => (!ids.length ? "Toda a rede" : ids.map((id) => dados?.escolas.find((e) => e.id === id)?.name ?? "Escola").join(", "));

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
                  <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                    <span className="flex-1 min-w-[180px]">
                      <span className="block text-[15px] font-semibold text-[#1F1A2E] break-words">{p.nome}</span>
                      <span className="block text-[13px] font-semibold text-[#5B21B6] break-words">{ROTULO_FUNCAO[p.funcaoNoApoio ?? "INDICADO"]} · {nomeDasEscolas(p.schoolIds)}</span>
                      <span className="block text-[12px] text-[#5B5470] break-words">{p.funcao} · {p.email}</span>
                    </span>
                    <button disabled={salvando} onClick={() => abrirFicha(p)} aria-label={`Alterar ${p.nome}`} className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl border border-[#DDD6EE] text-[#5B5470] shrink-0 disabled:opacity-60"><Pencil size={15} /></button>
                    <button disabled={salvando} onClick={() => mudar({ retirar: p.id })} className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-[#DDD6EE] text-[13px] font-bold text-[#B91C1C] shrink-0 disabled:opacity-60"><UserMinus size={15} />Retirar</button>
                  </li>
                ))}
              </ul>
            )}

            {ficha && (
              <div className="mt-4 rounded-2xl border-2 border-[#6D28D9] bg-[#FBFAFF] p-4 space-y-4">
                <div>
                  <p className="text-[15px] font-extrabold text-[#1F1A2E] break-words">{ficha.pessoa.nome}</p>
                  <p className="text-[12px] text-[#5B5470] break-words">{ficha.pessoa.funcao} · {ficha.pessoa.email}</p>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#5B5470] mb-2">Função no apoio ao aluno</p>
                  <div className="flex flex-wrap gap-2">
                    {FUNCOES_APOIO.map((f) => (
                      <button key={f} onClick={() => setFicha({ ...ficha, funcao: f })} aria-pressed={ficha.funcao === f}
                        className={`min-h-[44px] px-4 rounded-xl text-[14px] font-bold border-[1.5px] ${ficha.funcao === f ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>{ROTULO_FUNCAO[f]}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#5B5470] mb-2">Atende</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setFicha({ ...ficha, todas: true })} aria-pressed={ficha.todas} className={`min-h-[44px] rounded-xl text-[14px] font-bold border-[1.5px] ${ficha.todas ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>Toda a rede</button>
                    <button onClick={() => setFicha({ ...ficha, todas: false })} aria-pressed={!ficha.todas} className={`min-h-[44px] rounded-xl text-[14px] font-bold border-[1.5px] ${!ficha.todas ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>Escolas específicas</button>
                  </div>
                  {!ficha.todas && (
                    <ul className="mt-2 max-h-60 overflow-y-auto divide-y divide-[#F1EEF9] border border-[#EDE9F7] rounded-xl bg-white">
                      {dados.escolas.map((e) => {
                        const on = ficha.escolas.includes(e.id);
                        return (
                          <li key={e.id}>
                            <button onClick={() => setFicha({ ...ficha, escolas: on ? ficha.escolas.filter((x) => x !== e.id) : [...ficha.escolas, e.id] })} aria-pressed={on}
                              className={`w-full flex items-center gap-3 px-3 min-h-[44px] text-left ${on ? "bg-[#F5F3FF]" : ""}`}>
                              <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${on ? "bg-[#6D28D9] border-[#6D28D9]" : "border-[#C4B5FD]"}`}>{on && <Check size={13} className="text-white" strokeWidth={3} />}</span>
                              <span className="text-[14px] text-[#1F1A2E] min-w-0 break-words">{e.name}</span>
                            </button>
                          </li>
                        );
                      })}
                      {!dados.escolas.length && <li className="px-3 py-3 text-[14px] text-[#5B5470]">Nenhuma escola cadastrada.</li>}
                    </ul>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setFicha(null)} className="min-h-[48px] rounded-xl border-[1.5px] border-[#DDD6EE] text-[14px] font-bold text-[#5B5470]">Cancelar</button>
                  <button onClick={confirmarFicha} disabled={salvando} className="min-h-[48px] rounded-xl bg-[#6D28D9] text-white text-[14px] font-bold disabled:opacity-60">{ficha.pessoa.naEquipe ? "Salvar" : "Indicar para a equipe"}</button>
                </div>
              </div>
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
                  <button disabled={salvando} onClick={() => abrirFicha(p)} className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-[#EDE9FE] text-[13px] font-bold text-[#5B21B6] shrink-0 disabled:opacity-60"><UserPlus size={15} />Indicar</button>
                </li>
              ))}
              {!outros.length && <li className="px-3 py-4 text-[14px] text-[#5B5470] text-center">Ninguém encontrado.</li>}
            </ul>
          </section>

          <section className={cartao}>
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[#1F1A2E]"><BadgeCheck size={18} className="text-[#6D28D9]" />Cadastrar assistente social ou psicólogo</h2>
            <p className="text-[14px] text-[#5B5470] mt-1 leading-snug">Para profissionais que ainda não têm acesso à rede. Eles recebem um e-mail explicando o cadastro, conferem os próprios dados, aceitam o termo de sigilo e criam a senha. Se recusarem, você é avisado aqui.</p>
            <p className="text-[13px] text-[#5B5470] mt-2 rounded-xl bg-[#F8F7FC] px-3 py-2">{consultaAutomatica
              ? "Registro de psicólogo: conferido automaticamente no Conselho de Psicologia. Registro de assistente social: confira no site do CRESS antes de declarar."
              : "Confira o registro no site do conselho (CRP ou CRESS) antes de declarar."}</p>

            <form onSubmit={cadastrar} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {FUNCOES_REGISTRADAS.map((f) => (
                  <button type="button" key={f} onClick={() => setForm({ ...form, funcao: f })} aria-pressed={form.funcao === f}
                    className={`min-h-[44px] rounded-xl text-[14px] font-bold border-[1.5px] px-2 ${form.funcao === f ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>{ROTULO_FUNCAO[f]}</button>
                ))}
              </div>
              <div>
                <label htmlFor="pnome" className="block text-[13px] font-bold text-[#5B5470] mb-1">Nome completo, como está no conselho</label>
                <input id="pnome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className="w-full h-12 rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 text-[16px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none" />
              </div>
              <div>
                <label htmlFor="pemail" className="block text-[13px] font-bold text-[#5B5470] mb-1">E-mail do profissional</label>
                <input id="pemail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full h-12 rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 text-[16px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="preg" className="block text-[13px] font-bold text-[#5B5470] mb-1">Registro no {CONSELHO[form.funcao].sigla}</label>
                  <input id="preg" inputMode="numeric" value={form.registro} onChange={(e) => setForm({ ...form, registro: e.target.value })} required className="w-full h-12 rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 text-[16px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none" />
                </div>
                <div>
                  <label htmlFor="puf" className="block text-[13px] font-bold text-[#5B5470] mb-1">UF</label>
                  <select id="puf" value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} className="w-full h-12 rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-2 text-[16px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none">
                    {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#5B5470] mb-2">Atende</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setForm({ ...form, todas: true })} aria-pressed={form.todas} className={`min-h-[44px] rounded-xl text-[14px] font-bold border-[1.5px] ${form.todas ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>Toda a rede</button>
                  <button type="button" onClick={() => setForm({ ...form, todas: false })} aria-pressed={!form.todas} className={`min-h-[44px] rounded-xl text-[14px] font-bold border-[1.5px] ${!form.todas ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>Escolas específicas</button>
                </div>
                {!form.todas && (
                  <ul className="mt-2 max-h-60 overflow-y-auto divide-y divide-[#F1EEF9] border border-[#EDE9F7] rounded-xl bg-white">
                    {dados.escolas.map((e) => {
                      const on = form.escolas.includes(e.id);
                      return (
                        <li key={e.id}>
                          <button type="button" onClick={() => setForm({ ...form, escolas: on ? form.escolas.filter((x) => x !== e.id) : [...form.escolas, e.id] })} aria-pressed={on} className={`w-full flex items-center gap-3 px-3 min-h-[44px] text-left ${on ? "bg-[#F5F3FF]" : ""}`}>
                            <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${on ? "bg-[#6D28D9] border-[#6D28D9]" : "border-[#C4B5FD]"}`}>{on && <Check size={13} className="text-white" strokeWidth={3} />}</span>
                            <span className="text-[14px] text-[#1F1A2E] min-w-0 break-words">{e.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <button type="button" onClick={() => setForm({ ...form, declaro: !form.declaro })} aria-pressed={form.declaro}
                className={`w-full text-left rounded-xl border-[1.5px] p-3 flex items-start gap-3 ${form.declaro ? "border-[#6D28D9] bg-[#F5F3FF]" : "border-[#DDD6EE] bg-white"}`}>
                <span className={`w-6 h-6 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 ${form.declaro ? "bg-[#6D28D9] border-[#6D28D9]" : "border-[#C4B5FD]"}`}>{form.declaro && <Check size={15} className="text-white" strokeWidth={3} />}</span>
                <span className="text-[14px] text-[#1F1A2E] leading-snug">Declaro que as informações são verdadeiras, que este profissional tem registro ativo no conselho e que está autorizado pela Secretaria a ler os pedidos de apoio dos alunos. Sei que esta declaração fica registrada no meu nome.</span>
              </button>
              {erroCadastro && <p role="alert" className="rounded-xl bg-[#FEE2E2] text-[#991B1B] text-[14px] font-semibold px-3 py-2.5">{erroCadastro}</p>}
              {avisoCadastro && <p role="status" className="rounded-xl bg-[#DCFCE7] text-[#166534] text-[14px] font-semibold px-3 py-2.5">{avisoCadastro}</p>}
              <button type="submit" disabled={cadastrando || !form.declaro} className="w-full min-h-[52px] rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                <Send size={17} />{cadastrando ? "Conferindo e enviando..." : "Cadastrar e enviar o convite"}
              </button>
            </form>

            {!!cadastros.length && (
              <ul className="mt-5 divide-y divide-[#F1EEF9] border border-[#EDE9F7] rounded-xl">
                {cadastros.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-3">
                    <span className="flex-1 min-w-[180px]">
                      <span className="block text-[15px] font-semibold text-[#1F1A2E] break-words">{c.name}</span>
                      <span className="block text-[13px] text-[#5B5470] break-words">{ROTULO_FUNCAO[c.funcao]}{c.registro ? ` · ${c.conselho} ${c.registro}/${c.uf}` : ""} · {nomeDasEscolas(c.schoolIds)}</span>
                      <span className="block text-[12px] text-[#5B5470] break-words">{c.email}</span>
                      <span className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className={`text-[12px] font-bold rounded-full px-2.5 py-1 ${SITUACAO_DO_CADASTRO[c.status]?.cor ?? ""}`}>{SITUACAO_DO_CADASTRO[c.status]?.rotulo ?? c.status}</span>
                        {c.status !== "RECUSOU" && <span className="text-[12px] font-bold rounded-full px-2.5 py-1 bg-[#F1EEF9] text-[#5B5470]">{c.verificacao === "CONSULTADO" ? "Registro confirmado no conselho" : "Registro declarado pelo gestor"}</span>}
                      </span>
                    </span>
                    <button onClick={() => excluirCadastro(c)} className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-[#DDD6EE] text-[13px] font-bold text-[#B91C1C] shrink-0"><Trash2 size={15} />Excluir</button>
                  </li>
                ))}
              </ul>
            )}
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

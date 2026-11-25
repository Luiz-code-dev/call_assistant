"use client";
/**
 * Documento de encaminhamento de um pedido de apoio a um órgão da rede de proteção.
 * O profissional escreve a síntese, decide se inclui o relato do aluno e imprime ou salva em PDF.
 * O sistema não envia nada: a entrega é feita pelo canal oficial do município.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Printer, ShieldAlert } from "lucide-react";
import { ASSUNTO_PARA_A_EQUIPE, ORGAOS, ROTULO_ORGAO, ROTULO_FUNCAO, MAX_SINTESE, type AssuntoApoio, type Orgao, type FuncaoApoio } from "@/lib/escola/apoio-aluno";

interface Dados {
  pedido: { id: string; aluno: string; turma: string; escola: string; assunto: AssuntoApoio; texto: string | null; createdAt: string; comunicadoA: Orgao[] };
  eu: { nome: string; funcao: FuncaoApoio; registro: string | null };
  rede: { nome: string; cidade: string; uf: string };
}

const dataPorExtenso = (d: Date) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

export default function EncaminhamentoPage() {
  const { id } = useParams<{ id: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [orgao, setOrgao] = useState<Orgao>("CONSELHO_TUTELAR");
  const [sintese, setSintese] = useState("");
  const [providencias, setProvidencias] = useState("");
  const [comRelato, setComRelato] = useState(false);

  useEffect(() => {
    fetch(`/api/escola/apoio/pedidos/${id}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json().catch(() => null); if (!r.ok || !d?.pedido) throw new Error(); return d as Dados; })
      .then((d) => { setDados(d); if (d.pedido.comunicadoA?.[0]) setOrgao(d.pedido.comunicadoA[0]); })
      .catch(() => setErro("Não foi possível abrir este pedido."));
  }, [id]);

  async function imprimir() {
    // Fica registrado que o documento foi gerado, para qual órgão e se levou o relato
    await fetch(`/api/escola/apoio/pedidos/${id}/encaminhamento`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgao, comRelato }),
    }).catch(() => null);
    window.print();
  }

  if (erro) return <div className="px-4 sm:px-7 py-8"><p className="text-[#B91C1C]">{erro}</p></div>;
  if (!dados) return <div className="px-4 sm:px-7 py-8 text-[#5B5470]">Carregando...</div>;
  const p = dados.pedido;
  const campo = "w-full rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 py-2.5 text-[15px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none";
  const pronto = sintese.trim().length >= 20;
  const local = [dados.rede.cidade, dados.rede.uf].filter(Boolean).join("/");

  return (
    <div className="px-4 sm:px-7 py-6 sm:py-8 max-w-3xl mx-auto print:p-0 print:max-w-none">
      <div className="print:hidden space-y-5">
        <Link href="/escola/apoio" className="inline-flex items-center gap-1 text-sm font-semibold text-[#6D28D9]"><ChevronLeft size={16} />Pedidos de apoio</Link>
        <div>
          <h1 className="text-[#1F1A2E] font-extrabold text-[22px] sm:text-2xl leading-tight">Documento de encaminhamento</h1>
          <p className="text-[#5B5470] text-[14px] leading-snug mt-1">Monte o documento, imprima ou salve em PDF e entregue pelo canal oficial do município. O sistema não envia nada para fora.</p>
        </div>
        <div className="rounded-2xl bg-[#FFF7E0] border border-[#F2C94C] p-4 text-[14px] text-[#3B3550] leading-relaxed">
          <p className="flex items-center gap-2 font-extrabold text-[#92400E]"><ShieldAlert size={16} className="shrink-0" />Documento sigiloso</p>
          <p className="mt-1">Ele identifica o aluno. Entregue só ao órgão de destino e não deixe cópia em computador ou celular de uso comum.</p>
        </div>

        <section className="bg-white border border-[#E9E5F5] rounded-2xl p-4 sm:p-6 space-y-5">
          <div>
            <p className="text-[13px] font-bold text-[#5B5470] mb-2">Para qual órgão</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ORGAOS.map((o) => (
                <button key={o} onClick={() => setOrgao(o)} aria-pressed={orgao === o}
                  className={`min-h-[44px] rounded-xl px-3 text-left text-[14px] font-bold border-[1.5px] ${orgao === o ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>{ROTULO_ORGAO[o]}</button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="sintese" className="block text-[13px] font-bold text-[#5B5470] mb-1">Síntese da situação, com as suas palavras</label>
            <textarea id="sintese" value={sintese} onChange={(e) => setSintese(e.target.value.slice(0, MAX_SINTESE))} rows={5} className={campo + " resize-none"}
              placeholder="O que a equipe apurou e por que está encaminhando. Escreva só o necessário para o órgão agir." />
            <p className="text-[12px] text-[#8B84A0] mt-1 text-right">{sintese.length}/{MAX_SINTESE}</p>
          </div>
          <div>
            <label htmlFor="providencias" className="block text-[13px] font-bold text-[#5B5470] mb-1">Providências já tomadas (se houver)</label>
            <textarea id="providencias" value={providencias} onChange={(e) => setProvidencias(e.target.value.slice(0, MAX_SINTESE))} rows={3} className={campo + " resize-none"} />
          </div>
          {p.texto && (
            <button onClick={() => setComRelato(!comRelato)} aria-pressed={comRelato}
              className={`w-full text-left rounded-xl border-[1.5px] p-3 flex items-start gap-3 ${comRelato ? "border-[#6D28D9] bg-[#F5F3FF]" : "border-[#DDD6EE] bg-white"}`}>
              <span className={`w-5 h-5 mt-0.5 rounded border-2 shrink-0 ${comRelato ? "bg-[#6D28D9] border-[#6D28D9]" : "border-[#C4B5FD]"}`} />
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-[#1F1A2E]">Incluir o que o aluno escreveu, do jeito que ele escreveu</span>
                <span className="block text-[13px] text-[#5B5470]">Inclua só se o órgão precisar. Assim o aluno não tem de contar tudo de novo.</span>
              </span>
            </button>
          )}
          <button onClick={imprimir} disabled={!pronto} className="w-full min-h-[52px] rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            <Printer size={18} />Imprimir ou salvar em PDF
          </button>
          {!pronto && <p className="text-center text-[13px] text-[#5B5470]">Escreva a síntese para liberar o documento.</p>}
        </section>
        <p className="text-[13px] font-bold text-[#5B5470]">Como vai ficar</p>
      </div>

      {/* O documento. Na tela aparece como prévia; na impressão é a página inteira. */}
      <article className="mt-3 bg-white border border-[#E9E5F5] rounded-2xl p-6 sm:p-10 text-[#111] text-[14px] leading-relaxed print:mt-0 print:border-0 print:rounded-none print:p-0 print:text-[12pt]">
        <header className="text-center border-b border-[#111] pb-3">
          <p className="font-bold uppercase">{dados.rede.nome}</p>
          <p>Secretaria de Educação{local ? ` · ${local}` : ""}</p>
          <p>Equipe de apoio ao aluno</p>
        </header>
        <p className="mt-5 text-right">{local ? `${dados.rede.cidade}, ` : ""}{dataPorExtenso(new Date())}</p>
        <p className="mt-5 font-bold uppercase">Encaminhamento à rede de proteção</p>
        <p className="mt-1 font-bold">Documento sigiloso: contém dados pessoais de criança ou adolescente</p>
        <p className="mt-5"><b>Ao:</b> {ROTULO_ORGAO[orgao]}</p>
        <p className="mt-4">Encaminhamos, para as providências cabíveis, a situação do(a) estudante identificado(a) abaixo, que procurou a equipe de apoio ao aluno desta rede de ensino.</p>

        <p className="mt-5 font-bold">1. Identificação</p>
        <p>Estudante: {p.aluno}</p>
        {p.turma && <p>Turma: {p.turma}</p>}
        {p.escola && <p>Escola: {p.escola}</p>}
        <p>Data do pedido de apoio: {new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>

        <p className="mt-5 font-bold">2. Motivo do pedido</p>
        <p>{ASSUNTO_PARA_A_EQUIPE[p.assunto] ?? "Pedido de apoio"}</p>

        <p className="mt-5 font-bold">3. Síntese da equipe</p>
        <p className="whitespace-pre-wrap break-words">{sintese.trim() || "(a síntese aparece aqui)"}</p>

        {providencias.trim() && (<><p className="mt-5 font-bold">4. Providências já tomadas</p><p className="whitespace-pre-wrap break-words">{providencias.trim()}</p></>)}

        {comRelato && p.texto && (
          <>
            <p className="mt-5 font-bold">{providencias.trim() ? "5" : "4"}. Relato do(a) estudante, como foi escrito</p>
            <p className="whitespace-pre-wrap break-words border-l-2 border-[#111] pl-3">{p.texto}</p>
          </>
        )}

        {orgao === "CONSELHO_TUTELAR" && <p className="mt-5">Esta comunicação atende ao art. 13 do Estatuto da Criança e do Adolescente (Lei 8.069/1990).</p>}
        <p className="mt-5">Pedimos que o(a) estudante seja ouvido(a) uma única vez, por profissional preparado, para que não precise repetir o relato.</p>

        <div className="mt-14 text-center">
          <p>______________________________________________</p>
          <p className="font-bold">{dados.eu.nome}</p>
          <p>{ROTULO_FUNCAO[dados.eu.funcao] ?? "Equipe de apoio ao aluno"} · Equipe de apoio ao aluno</p>
          {dados.eu.registro && <p>{dados.eu.registro}</p>}
        </div>
      </article>
    </div>
  );
}

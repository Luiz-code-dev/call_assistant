"use client";
/**
 * Avisar as famílias: o professor escolhe a turma, a matéria, o assunto e para quem vai o aviso.
 * A família recebe no celular, por e-mail e no painel. Tudo o que foi enviado fica guardado
 * na aba "Enviados", com quem já viu.
 */
import { useEffect, useMemo, useState } from "react";
import {
  HeartHandshake, Send, Check, Users, User, Eye, CalendarCheck, ChevronDown, Inbox,
  BookOpen, Star, ClipboardList, CalendarClock, MessagesSquare, MessageCircle, type LucideIcon,
} from "lucide-react";
import { DESCRICAO_AVISO, MAX_TEXTO_INDICACAO, ROTULO_AVISO, TIPOS_AVISO, tituloDoAviso, type TipoAviso } from "@/lib/escola/professor-familia";

interface Oferta { id: string; classId: string; turma: string; ano: number; materia: string; alunos: { id: string; nome: string }[] }
interface Destinatario { nome: string; viu: boolean; naAgenda: boolean }
interface Envio {
  id: string; turma: string; materia: string; tipo: TipoAviso; texto: string; createdAt: string;
  alunos: string[]; destinatarios: Destinatario[]; total: number; lidos: number; naAgenda: number;
}

const ICONE: Record<TipoAviso, LucideIcon> = {
  REFORCO: BookOpen, ELOGIO: Star, TAREFA: ClipboardList, FREQUENCIA: CalendarClock, CONVIVENCIA: MessagesSquare, RECADO: MessageCircle,
};
const COR: Record<TipoAviso, { texto: string; fundo: string }> = {
  REFORCO: { texto: "#6D28D9", fundo: "#EDE9FE" },
  ELOGIO: { texto: "#B45309", fundo: "#FEF3C7" },
  TAREFA: { texto: "#1D4ED8", fundo: "#DBEAFE" },
  FREQUENCIA: { texto: "#B91C1C", fundo: "#FEE2E2" },
  CONVIVENCIA: { texto: "#0F766E", fundo: "#CCFBF1" },
  RECADO: { texto: "#5B5470", fundo: "#EFEDF5" },
};

function quando(iso: string) {
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (dias <= 0) return `hoje, ${hora}`;
  if (dias === 1) return `ontem, ${hora}`;
  return d.toLocaleDateString("pt-BR");
}

/** Frases prontas para começar. O professor edita como quiser. */
function sugestoes(tipo: TipoAviso, materia: string): string[] {
  const m = materia || "a matéria";
  switch (tipo) {
    case "ELOGIO": return [
      `Quero contar que tem se esforçado bastante nas aulas de ${m}. Parabéns pelo apoio em casa.`,
      "Hoje ajudou um colega com muita paciência. Fiquei feliz em ver.",
      `Teve um avanço importante em ${m} nesta semana.`,
    ];
    case "TAREFA": return [
      `Há uma tarefa de ${m} para entregar na próxima aula. Peço que acompanhem em casa.`,
      `Na próxima aula de ${m} vamos precisar do material combinado. Podem ajudar a lembrar?`,
      `Ficou uma tarefa de ${m} sem entregar. Ainda dá tempo de trazer.`,
    ];
    case "FREQUENCIA": return [
      "Senti falta nas últimas aulas. Está tudo bem? Se precisar, a escola pode ajudar.",
      "Tem chegado depois do início da aula. Podemos combinar como ajudar?",
    ];
    case "CONVIVENCIA": return [
      "Gostaria de conversar sobre como tem sido a convivência na turma. Podem vir à escola nesta semana?",
      "Tem estado mais quieto nas aulas. Vale uma conversa em casa para saber como está.",
    ];
    case "RECADO": return [
      "Na próxima semana teremos uma atividade especial. Em breve mando os detalhes.",
      `Gostaria de conversar sobre o andamento em ${m}. Podem procurar a escola?`,
    ];
    default: return [
      `Percebi em sala que precisa reforçar ${m}. 15 minutos por dia em casa já ajudam muito.`,
      `Está com dificuldade no conteúdo atual de ${m}. Vale praticar as trilhas do reforço esta semana.`,
      `Antes da próxima avaliação, recomendo reforçar ${m} em casa.`,
    ];
  }
}

export default function AvisarFamiliasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [aba, setAba] = useState<"novo" | "enviados">("novo");
  const [turmaId, setTurmaId] = useState("");
  const [ofertaId, setOfertaId] = useState("");
  const [tipo, setTipo] = useState<TipoAviso>("REFORCO");
  const [todos, setTodos] = useState(false);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [assinatura, setAssinatura] = useState("Professor(a)");

  function carregar() {
    fetch("/api/escola/professor/indicar-reforco", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        const lista: Oferta[] = d.ofertas ?? [];
        setOfertas(lista); setEnvios(d.envios ?? []);
        if (typeof d.assinatura === "string" && d.assinatura) setAssinatura(d.assinatura);
        setTurmaId((atual) => atual || lista[0]?.classId || "");
        setOfertaId((atual) => atual || lista[0]?.id || "");
        setCarregando(false);
      })
      .catch(() => { setErroCarga("Não foi possível carregar as suas turmas."); setCarregando(false); });
  }
  useEffect(carregar, []);

  // Turmas sem repetição e as matérias do professor em cada uma
  const turmas = useMemo(() => {
    const vistas = new Map<string, { classId: string; turma: string }>();
    for (const o of ofertas) if (!vistas.has(o.classId)) vistas.set(o.classId, { classId: o.classId, turma: o.turma });
    return Array.from(vistas.values());
  }, [ofertas]);
  const materiasDaTurma = useMemo(() => ofertas.filter((o) => o.classId === turmaId), [ofertas, turmaId]);
  const oferta = useMemo(() => materiasDaTurma.find((o) => o.id === ofertaId) ?? materiasDaTurma[0] ?? null, [materiasDaTurma, ofertaId]);

  function trocarTurma(classId: string) {
    setTurmaId(classId);
    setOfertaId(ofertas.find((o) => o.classId === classId)?.id ?? "");
    setEscolhidos([]);
  }

  const quantos = todos ? oferta?.alunos.length ?? 0 : escolhidos.length;
  const podeEnviar = !!oferta && quantos > 0 && texto.trim().length >= 5 && !enviando;
  const primeiroEscolhido = oferta?.alunos.find((a) => escolhidos.includes(a.id))?.nome.split(" ")[0];
  const exemploDeNome = todos || !primeiroEscolhido ? "o aluno" : primeiroEscolhido;

  async function enviar() {
    if (!oferta) return;
    setErro(""); setOk(""); setEnviando(true);
    const r = await fetch("/api/escola/professor/indicar-reforco", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classSubjectId: oferta.id, todos, studentIds: escolhidos, text: texto, kind: tipo }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnviando(false);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível enviar."); return; }
    setOk(`Aviso enviado para as famílias de ${d.alunos} ${d.alunos === 1 ? "aluno" : "alunos"}. Ele fica guardado em Enviados.`);
    setTexto(""); setEscolhidos([]); setTodos(false);
    carregar();
  }

  const campo = "w-full rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 text-[16px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none";
  const rotulo = "block text-[13px] font-bold text-[#5B5470] mb-2";

  return (
    <div className="px-4 sm:px-7 py-6 sm:py-8 max-w-3xl mx-auto">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0"><HeartHandshake size={22} /></span>
        <div className="min-w-0">
          <h1 className="text-[#1F1A2E] font-extrabold text-[22px] sm:text-2xl leading-tight">Avisar as famílias</h1>
          <p className="text-[#5B5470] text-[14px] leading-snug mt-1">Escolha a turma, o assunto e escreva a mensagem. A família recebe no celular e no painel dela.</p>
        </div>
      </div>

      <div role="tablist" aria-label="Avisos" className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-[#EFEDF5] p-1">
        {([["novo", "Novo aviso"], ["enviados", `Enviados${envios.length ? ` (${envios.length})` : ""}`]] as const).map(([id, nome]) => (
          <button key={id} role="tab" aria-selected={aba === id} onClick={() => setAba(id)}
            className={`min-h-[44px] rounded-xl text-[14px] font-bold transition-colors ${aba === id ? "bg-white text-[#6D28D9] shadow-sm" : "text-[#5B5470]"}`}>
            {nome}
          </button>
        ))}
      </div>

      {carregando ? <p className="text-[#5B5470] text-center py-10">Carregando...</p> : erroCarga ? (
        <p className="text-[#B91C1C] text-sm mt-5">{erroCarga}</p>
      ) : aba === "enviados" ? (
        <section className="mt-5" aria-label="Avisos enviados">
          {!envios.length ? (
            <div className="bg-white border border-[#E9E5F5] rounded-2xl p-8 text-center">
              <Inbox className="mx-auto text-[#C4B5FD] mb-3" size={40} />
              <p className="text-[#1F1A2E] font-semibold">Você ainda não enviou avisos.</p>
              <p className="text-[#5B5470] text-[14px] mt-1">Os avisos enviados ficam guardados aqui, com quem já viu.</p>
              <button onClick={() => setAba("novo")} className="mt-4 inline-flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 rounded-xl text-sm font-bold min-h-[44px]">
                <Send size={15} />Escrever um aviso
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {envios.map((e) => {
                const Icone = ICONE[e.tipo] ?? MessageCircle;
                const cor = COR[e.tipo] ?? COR.RECADO;
                const expandido = aberto === e.id;
                return (
                  <li key={e.id} className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
                    <button onClick={() => setAberto(expandido ? null : e.id)} aria-expanded={expandido} className="w-full text-left p-4 flex items-start gap-3">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cor.fundo, color: cor.texto }}><Icone size={19} /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12px] font-extrabold uppercase tracking-wide" style={{ color: cor.texto }}>{ROTULO_AVISO[e.tipo] ?? "Aviso"}</span>
                        <span className="block text-[13px] text-[#5B5470]">{e.turma} · {e.materia} · {quando(e.createdAt)}</span>
                        <span className={`block text-[15px] text-[#1F1A2E] mt-1.5 leading-snug break-words ${expandido ? "" : "line-clamp-2"}`}>{e.texto}</span>
                        <span className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[13px] font-semibold">
                          <span className="inline-flex items-center gap-1 text-[#5B5470]"><Users size={14} />{e.total === 1 ? e.destinatarios[0]?.nome ?? e.alunos[0] : `${e.total} alunos`}</span>
                          <span className="inline-flex items-center gap-1 text-[#5B5470]"><Eye size={14} />{e.lidos} de {e.total} {e.lidos === 1 ? "família viu" : "famílias viram"}</span>
                          {e.tipo === "REFORCO" && <span className="inline-flex items-center gap-1 text-[#166534]"><CalendarCheck size={14} />{e.naAgenda} na agenda</span>}
                        </span>
                      </span>
                      <ChevronDown size={18} className={`text-[#8B84A0] shrink-0 mt-1 transition-transform ${expandido ? "rotate-180" : ""}`} />
                    </button>
                    {expandido && (
                      <ul className="border-t border-[#F1EEF9] divide-y divide-[#F1EEF9]">
                        {e.destinatarios.map((d) => (
                          <li key={d.nome} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <span className="text-[14px] text-[#1F1A2E] min-w-0 break-words">{d.nome}</span>
                            <span className={`text-[12px] font-bold rounded-full px-2.5 py-1 shrink-0 ${d.viu ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F1EEF9] text-[#5B5470]"}`}>
                              {d.naAgenda ? "Pôs na agenda" : d.viu ? "Família viu" : "Ainda não viu"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : !ofertas.length ? (
        <div className="mt-5 bg-white border border-[#E9E5F5] rounded-2xl p-8 text-center">
          <Users className="mx-auto text-[#C4B5FD] mb-3" size={40} />
          <p className="text-[#5B5470]">Você ainda não tem turmas atribuídas. A direção atribui as turmas e matérias em Atribuições.</p>
        </div>
      ) : (
        <section className="mt-5 bg-white border border-[#E9E5F5] rounded-2xl p-4 sm:p-6 space-y-6" aria-label="Novo aviso">
          {/* 1. Turma e matéria */}
          <div>
            <p className={rotulo}>1. Turma</p>
            <div className="flex flex-wrap gap-2">
              {turmas.map((t) => (
                <button key={t.classId} onClick={() => trocarTurma(t.classId)} aria-pressed={turmaId === t.classId}
                  className={`min-h-[44px] px-4 rounded-xl text-[14px] font-bold border-[1.5px] ${turmaId === t.classId ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>
                  {t.turma}
                </button>
              ))}
            </div>
            {materiasDaTurma.length > 1 ? (
              <>
                <p className={rotulo + " mt-4"}>Matéria</p>
                <div className="flex flex-wrap gap-2">
                  {materiasDaTurma.map((o) => (
                    <button key={o.id} onClick={() => setOfertaId(o.id)} aria-pressed={oferta?.id === o.id}
                      className={`min-h-[44px] px-4 rounded-xl text-[14px] font-bold border-[1.5px] ${oferta?.id === o.id ? "bg-[#EDE9FE] text-[#5B21B6] border-[#6D28D9]" : "bg-white text-[#1F1A2E] border-[#DDD6EE]"}`}>
                      {o.materia}
                    </button>
                  ))}
                </div>
              </>
            ) : oferta ? (
              <p className="text-[13px] text-[#5B5470] mt-2">Matéria: <b className="text-[#1F1A2E]">{oferta.materia}</b></p>
            ) : null}
            <p className="text-[12px] text-[#8B84A0] mt-2">Aparecem as turmas e as matérias que a direção atribuiu a você.</p>
          </div>

          {/* 2. Assunto */}
          <div>
            <p className={rotulo}>2. Assunto do aviso</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIPOS_AVISO.map((t) => {
                const Icone = ICONE[t]; const cor = COR[t]; const on = tipo === t;
                return (
                  <button key={t} onClick={() => setTipo(t)} aria-pressed={on}
                    className="min-h-[56px] rounded-xl px-3 py-2 text-left text-[14px] font-bold inline-flex items-center gap-2 border-2 min-w-0"
                    style={{ background: on ? cor.fundo : "#fff", borderColor: on ? cor.texto : "#EDE9F7", color: on ? cor.texto : "#1F1A2E" }}>
                    <Icone size={18} className="shrink-0" /><span className="min-w-0 break-words leading-tight">{ROTULO_AVISO[t]}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[13px] text-[#5B5470] mt-2">{DESCRICAO_AVISO[tipo]}</p>
          </div>

          {/* 3. Para quem */}
          <div>
            <p className={rotulo}>3. Para quem</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setTodos(true)} aria-pressed={todos} className={`min-h-[48px] rounded-xl font-bold text-[14px] inline-flex items-center justify-center gap-2 border-[1.5px] px-2 ${todos ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#5B5470] border-[#DDD6EE]"}`}>
                <Users size={16} className="shrink-0" />Turma toda
              </button>
              <button onClick={() => setTodos(false)} aria-pressed={!todos} className={`min-h-[48px] rounded-xl font-bold text-[14px] inline-flex items-center justify-center gap-2 border-[1.5px] px-2 ${!todos ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#5B5470] border-[#DDD6EE]"}`}>
                <User size={16} className="shrink-0" />Escolher alunos
              </button>
            </div>
            {todos ? (
              <p className="text-[13px] text-[#5B5470] bg-[#F8F7FC] rounded-xl px-3 py-2.5">As famílias dos {oferta?.alunos.length ?? 0} alunos da turma vão receber.</p>
            ) : !oferta?.alunos.length ? (
              <p className="text-[13px] text-[#8B84A0]">Esta turma ainda não tem alunos.</p>
            ) : (
              <>
                <ul className="max-h-72 overflow-y-auto rounded-xl border border-[#EDE9F7] divide-y divide-[#F1EEF9]">
                  {oferta.alunos.map((a) => {
                    const on = escolhidos.includes(a.id);
                    return (
                      <li key={a.id}>
                        <button onClick={() => setEscolhidos((l) => (on ? l.filter((x) => x !== a.id) : [...l, a.id]))} aria-pressed={on}
                          className={`w-full flex items-center gap-3 px-3 min-h-[48px] text-left ${on ? "bg-[#F5F3FF]" : "bg-white"}`}>
                          <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${on ? "bg-[#6D28D9] border-[#6D28D9]" : "border-[#C4B5FD]"}`}>
                            {on && <Check size={14} className="text-white" strokeWidth={3} />}
                          </span>
                          <span className="text-[15px] text-[#1F1A2E] min-w-0 break-words">{a.nome}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[12px] text-[#8B84A0] mt-1.5">{escolhidos.length ? `${escolhidos.length} ${escolhidos.length === 1 ? "aluno escolhido" : "alunos escolhidos"}` : "Toque nos alunos que vão receber o aviso."}</p>
              </>
            )}
          </div>

          {/* 4. Mensagem */}
          <div>
            <label htmlFor="mensagem" className={rotulo}>4. Mensagem para a família</label>
            <textarea id="mensagem" value={texto} onChange={(e) => setTexto(e.target.value.slice(0, MAX_TEXTO_INDICACAO))} rows={5}
              placeholder="Escreva com as suas palavras"
              className={campo + " py-3 resize-none"} />
            <div className="flex justify-between gap-3 text-[12px] text-[#8B84A0] mt-1"><span>Não coloque notas na mensagem.</span><span className="shrink-0">{texto.length}/{MAX_TEXTO_INDICACAO}</span></div>
            <p className="text-[12px] font-bold text-[#5B5470] mt-3 mb-1.5">Se quiser, comece por uma destas e edite:</p>
            <div className="space-y-2">
              {sugestoes(tipo, oferta?.materia ?? "").map((s) => (
                <button key={s} onClick={() => setTexto(s)} className="block w-full text-left text-[13px] leading-snug text-[#4C1D95] bg-[#F5F3FF] rounded-xl px-3 py-2.5 hover:bg-[#EDE9FE]">{s}</button>
              ))}
            </div>
          </div>

          {/* Como a família vai ver */}
          {oferta && texto.trim().length >= 5 && (
            <div className="rounded-2xl border border-dashed border-[#C4B5FD] bg-[#FBFAFF] p-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#5B5470]">Como a família vai ver</p>
              <p className="text-[15px] font-bold text-[#1F1A2E] mt-1.5 leading-snug break-words">{tituloDoAviso(tipo, assinatura, oferta.materia, exemploDeNome)}</p>
              <p className="text-[14px] text-[#3B3550] mt-1 leading-snug break-words">{texto}</p>
            </div>
          )}

          {erro && <p role="alert" className="text-[14px] font-semibold text-[#B91C1C]">{erro}</p>}
          {ok && <p role="status" className="text-[14px] text-[#166534] bg-[#F0FDF4] rounded-xl px-3 py-2.5 flex items-start gap-2"><Check size={16} className="shrink-0 mt-0.5" />{ok}</p>}
          <button onClick={enviar} disabled={!podeEnviar}
            className="w-full min-h-[52px] rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            <Send size={17} />{enviando ? "Enviando..." : quantos ? `Enviar para ${quantos} ${quantos === 1 ? "família" : "famílias"}` : "Enviar"}
          </button>
        </section>
      )}
    </div>
  );
}

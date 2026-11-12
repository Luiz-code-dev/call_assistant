"use client";
/**
 * Avisar as famílias: o professor indica reforço numa matéria para a turma toda ou para
 * alguns alunos. A família recebe no celular e no painel, com o botão de pôr na agenda.
 */
import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, Send, Check, Users, User, Eye, CalendarCheck } from "lucide-react";

interface Oferta { id: string; turma: string; ano: number; materia: string; alunos: { id: string; nome: string }[] }
interface Envio { id: string; turma: string; materia: string; texto: string; createdAt: string; alunos: string[]; total: number; lidos: number; naAgenda: number }

const MAX = 300;

function quando(iso: string) {
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return dias <= 0 ? `hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : dias === 1 ? "ontem" : `há ${dias} dias`;
}

function sugestoes(materia: string) {
  const m = materia || "a matéria";
  return [
    `Percebi em sala que precisa reforçar ${m}. 15 minutos por dia em casa já ajudam muito.`,
    `Está com dificuldade no conteúdo atual de ${m}. Vale praticar as trilhas do reforço esta semana.`,
    `Antes da próxima avaliação, recomendo reforçar ${m} em casa.`,
  ];
}

export default function IndicarReforcoPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [ofertaId, setOfertaId] = useState("");
  const [todos, setTodos] = useState(false);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  function carregar() {
    fetch("/api/escola/professor/indicar-reforco", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        setOfertas(d.ofertas ?? []); setEnvios(d.envios ?? []);
        setOfertaId((atual) => atual || d.ofertas?.[0]?.id || "");
        setCarregando(false);
      })
      .catch(() => { setErroCarga("Não foi possível carregar as suas turmas."); setCarregando(false); });
  }
  useEffect(carregar, []);

  const oferta = useMemo(() => ofertas.find((o) => o.id === ofertaId) ?? null, [ofertas, ofertaId]);
  useEffect(() => { setEscolhidos([]); }, [ofertaId]);

  const quantos = todos ? oferta?.alunos.length ?? 0 : escolhidos.length;
  const podeEnviar = !!oferta && quantos > 0 && texto.trim().length >= 5 && !enviando;

  async function enviar() {
    if (!oferta) return;
    setErro(""); setOk(""); setEnviando(true);
    const r = await fetch("/api/escola/professor/indicar-reforco", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classSubjectId: oferta.id, todos, studentIds: escolhidos, text: texto }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnviando(false);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível enviar."); return; }
    setOk(`Aviso enviado para as famílias de ${d.alunos} ${d.alunos === 1 ? "aluno" : "alunos"}.`);
    setTexto(""); setEscolhidos([]); setTodos(false);
    carregar();
  }

  const campo = "w-full rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 text-[15px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none";

  return (
    <div className="px-5 sm:px-7 py-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <HeartHandshake className="text-[#6D28D9]" size={24} />
        <h1 className="text-[#1F1A2E] font-bold text-2xl">Avisar as famílias</h1>
      </div>
      <p className="text-[#5B5470] text-sm mb-6">Indique reforço numa matéria para a turma toda ou para alguns alunos. A família recebe no celular e pode pôr o reforço na agenda do filho.</p>

      {carregando ? <p className="text-[#5B5470] text-center py-8">Carregando...</p> : erroCarga ? (
        <p className="text-[#B91C1C] text-sm">{erroCarga}</p>
      ) : !ofertas.length ? (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-8 text-center">
          <Users className="mx-auto text-[#DDD6EE] mb-3" size={40} />
          <p className="text-[#5B5470]">Você ainda não tem turmas atribuídas. A direção atribui as turmas e matérias em Atribuições.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          <section className="bg-white border border-[#E9E5F5] rounded-2xl p-5 space-y-5">
            <label className="block text-[13px] font-bold text-[#5B5470]">Turma e matéria
              <select value={ofertaId} onChange={(e) => setOfertaId(e.target.value)} className={campo + " mt-1 h-12"}>
                {ofertas.map((o) => <option key={o.id} value={o.id}>{o.turma} · {o.materia}</option>)}
              </select>
            </label>

            <div>
              <p className="text-[13px] font-bold text-[#5B5470] mb-2">Para quem</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => setTodos(true)} className={`h-12 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 border ${todos ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#5B5470] border-[#DDD6EE]"}`}>
                  <Users size={16} />Turma toda
                </button>
                <button onClick={() => setTodos(false)} className={`h-12 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 border ${!todos ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#5B5470] border-[#DDD6EE]"}`}>
                  <User size={16} />Alunos específicos
                </button>
              </div>
              {todos ? (
                <p className="text-[13px] text-[#5B5470] bg-[#F8F7FC] rounded-xl px-3 py-2">As famílias dos {oferta?.alunos.length ?? 0} alunos da turma vão receber.</p>
              ) : !oferta?.alunos.length ? (
                <p className="text-[13px] text-[#8B84A0]">Esta turma ainda não tem alunos.</p>
              ) : (
                <ul className="max-h-72 overflow-y-auto rounded-xl border border-[#EDE9F7] divide-y divide-[#F1EEF9]">
                  {oferta.alunos.map((a) => {
                    const on = escolhidos.includes(a.id);
                    return (
                      <li key={a.id}>
                        <button onClick={() => setEscolhidos((l) => on ? l.filter((x) => x !== a.id) : [...l, a.id])}
                          className={`w-full flex items-center gap-3 px-3 min-h-[48px] text-left ${on ? "bg-[#F5F3FF]" : "bg-white hover:bg-[#FBFAFF]"}`}>
                          <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${on ? "bg-[#6D28D9] border-[#6D28D9]" : "border-[#C4B5FD]"}`}>
                            {on && <Check size={14} className="text-white" strokeWidth={3} />}
                          </span>
                          <span className="text-[14px] text-[#1F1A2E]">{a.nome}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#5B5470]">Mensagem para a família
                <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, MAX))} rows={4}
                  placeholder="O que o aluno precisa reforçar e como a família pode ajudar"
                  className={campo + " mt-1 py-3 resize-none"} />
              </label>
              <div className="flex justify-between text-[11px] text-[#8B84A0] mt-1"><span>Não coloque notas na mensagem.</span><span>{texto.length}/{MAX}</span></div>
              <div className="flex flex-wrap gap-2 mt-2">
                {sugestoes(oferta?.materia ?? "").map((s) => (
                  <button key={s} onClick={() => setTexto(s)} className="text-left text-[12px] text-[#4C1D95] bg-[#F5F3FF] rounded-xl px-3 py-2 hover:bg-[#EDE9FE]">{s}</button>
                ))}
              </div>
            </div>

            {erro && <p className="text-[13px] text-[#B91C1C]">{erro}</p>}
            {ok && <p className="text-[13px] text-[#166534] bg-[#F0FDF4] rounded-xl px-3 py-2 inline-flex items-center gap-2"><Check size={15} />{ok}</p>}
            <button onClick={enviar} disabled={!podeEnviar}
              className="w-full h-12 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <Send size={16} />{enviando ? "Enviando..." : quantos ? `Enviar para ${quantos} ${quantos === 1 ? "família" : "famílias"}` : "Enviar"}
            </button>
          </section>

          <section className="bg-white border border-[#E9E5F5] rounded-2xl p-5">
            <h2 className="font-bold text-[#1F1A2E] mb-3">Avisos enviados</h2>
            {!envios.length ? <p className="text-[13px] text-[#8B84A0]">Nenhum aviso enviado ainda.</p> : (
              <ul className="space-y-3">
                {envios.map((e) => (
                  <li key={e.id} className="rounded-xl bg-[#F8F7FC] p-3">
                    <p className="text-[12px] font-bold text-[#6D28D9]">{e.turma} · {e.materia}</p>
                    <p className="text-[13px] text-[#1F1A2E] mt-0.5 leading-snug">{e.texto}</p>
                    <p className="text-[11px] text-[#8B84A0] mt-1">
                      {quando(e.createdAt)} · {e.total === 1 ? e.alunos[0] : `${e.total} alunos`}
                    </p>
                    <div className="flex gap-3 mt-2 text-[12px] font-semibold">
                      <span className="inline-flex items-center gap-1 text-[#5B5470]"><Eye size={13} />{e.lidos} de {e.total} viram</span>
                      <span className="inline-flex items-center gap-1 text-[#166534]"><CalendarCheck size={13} />{e.naAgenda} na agenda</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

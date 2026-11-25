"use client";
/**
 * Canal de apoio do aluno: pedir para conversar com um adulto ou contar algo que preocupa.
 * Cuidados desta tela: palavras simples e sem julgamento, nenhuma pergunta que conduza o relato,
 * nada do que foi escrito ou gravado volta a aparecer no aparelho, e um botão para sair rápido.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mic, Square, Trash2, Send, Phone, X, Check, HeartHandshake } from "lucide-react";
import { ASSUNTOS_APOIO, ASSUNTO_PARA_O_ALUNO, MAX_TEXTO_APOIO, MAX_AUDIO_SEGUNDOS, type AssuntoApoio } from "@/lib/escola/apoio-aluno";

type Fase = "carregando" | "indisponivel" | "form" | "enviado";

export default function ApoioDoAlunoPage() {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("carregando");
  const [comAudio, setComAudio] = useState(false);
  const [situacoes, setSituacoes] = useState<{ id: string; situacao: string }[]>([]);
  const [assunto, setAssunto] = useState<AssuntoApoio | null>(null);
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const relogio = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    fetch("/api/escola/aluno/apoio", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.disponivel) { setFase("indisponivel"); return; }
        setComAudio(!!d.audio && typeof window !== "undefined" && "MediaRecorder" in window);
        setSituacoes(d.pedidos ?? []);
        setFase("form");
      })
      .catch(() => setFase("indisponivel"));
    return soltarMicrofone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Ao sair da tela, para o relógio e solta o microfone. */
  function soltarMicrofone() {
    clearInterval(relogio.current);
    gravador.current?.stream.getTracks().forEach((t) => t.stop());
  }

  function sair() { router.replace("/escola/aluno"); }

  async function gravar() {
    setErro("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      pedacos.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) pedacos.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(pedacos.current, { type: mr.mimeType });
        setAudio(blob); setAudioUrl(URL.createObjectURL(blob)); setGravando(false);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(200);
      gravador.current = mr;
      setGravando(true); setSegundos(0);
      relogio.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= MAX_AUDIO_SEGUNDOS) { clearInterval(relogio.current); mr.stop(); return MAX_AUDIO_SEGUNDOS; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setErro("Não foi possível usar o microfone. Você pode escrever.");
    }
  }
  function parar() { clearInterval(relogio.current); gravador.current?.stop(); }
  function apagarAudio() { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudio(null); setAudioUrl(null); setSegundos(0); }

  async function enviar() {
    if (!assunto || enviando) return;
    setErro(""); setEnviando(true);
    const form = new FormData();
    form.set("assunto", assunto);
    if (texto.trim()) form.set("text", texto.trim());
    if (audio) form.set("audio", audio, audio.type.includes("mp4") ? "audio.mp4" : "audio.webm");
    const r = await fetch("/api/escola/aluno/apoio", { method: "POST", body: form }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnviando(false);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível enviar agora. Tente de novo."); return; }
    // Nada do que foi escrito ou gravado fica na tela
    setTexto(""); apagarAudio(); setAssunto(null);
    setFase("enviado");
  }

  const tempo = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#F6F4FE] pb-10">
      <header className="bg-white border-b border-[#E9E5F5]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[15px] font-extrabold text-[#1F1A2E] min-w-0"><HeartHandshake size={20} className="text-[#6D28D9] shrink-0" /><span className="truncate">Quero falar com alguém</span></p>
          <button onClick={sair} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-[#F1EEF9] text-[#1F1A2E] text-[14px] font-bold shrink-0"><X size={16} />Sair</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {fase === "carregando" && <p className="text-center text-[#5B5470] py-10">Carregando...</p>}

        {fase === "indisponivel" && (
          <div className="bg-white rounded-3xl p-6 text-center">
            <p className="text-[16px] font-bold text-[#1F1A2E]">Esta página não está disponível agora.</p>
            <p className="text-[15px] text-[#5B5470] mt-2">Se precisar de ajuda, procure um adulto de confiança na escola ou ligue 100.</p>
            <button onClick={sair} className="mt-5 w-full min-h-[52px] rounded-2xl bg-[#6D28D9] text-white font-bold">Voltar para o início</button>
          </div>
        )}

        {fase === "enviado" && (
          <div className="bg-white rounded-3xl p-6 text-center">
            <span className="mx-auto w-14 h-14 rounded-full bg-[#DCFCE7] text-[#166534] flex items-center justify-center"><Check size={28} strokeWidth={3} /></span>
            <p className="text-[20px] font-extrabold text-[#1F1A2E] mt-4">Seu pedido chegou</p>
            <p className="text-[16px] text-[#3B3550] leading-relaxed mt-2">Você fez bem em pedir ajuda. Um adulto da equipe de apoio vai te procurar na escola assim que puder.</p>
            <p className="text-[15px] text-[#5B5470] leading-relaxed mt-3">O que você mandou não fica aparecendo neste aparelho.</p>
            <button onClick={sair} className="mt-6 w-full min-h-[52px] rounded-2xl bg-[#6D28D9] text-white font-bold">Voltar para o início</button>
          </div>
        )}

        {fase === "form" && (
          <>
            <section className="bg-white rounded-3xl p-5">
              <p className="text-[18px] font-extrabold text-[#1F1A2E] leading-snug">Você pode contar aqui o que está te deixando triste, com medo ou preocupado.</p>
              <p className="text-[16px] text-[#3B3550] leading-relaxed mt-2">Pedir ajuda é um direito seu. Você não fez nada de errado.</p>
            </section>

            {!!situacoes.length && (
              <section className="bg-[#EEF9F1] rounded-3xl p-4">
                {situacoes.map((s) => <p key={s.id} className="flex items-center gap-2 text-[15px] font-semibold text-[#166534]"><Check size={16} strokeWidth={3} className="shrink-0" />{s.situacao}</p>)}
                <p className="text-[14px] text-[#3B3550] mt-1">Se quiser, você pode mandar outro pedido.</p>
              </section>
            )}

            <section className="bg-white rounded-3xl p-5">
              <p className="flex items-center gap-2 text-[15px] font-extrabold text-[#1F1A2E]"><ShieldCheck size={18} className="text-[#6D28D9] shrink-0" />Quem vai ler</p>
              <ul className="mt-2 space-y-2 text-[15px] text-[#3B3550] leading-relaxed">
                <li>Só a equipe de apoio da Secretaria de Educação.</li>
                <li>Seus professores, seus colegas e sua família não veem o que você mandar por aqui.</li>
                <li>Para te proteger, essa equipe pode precisar chamar outros adultos que cuidam da segurança de crianças e adolescentes.</li>
              </ul>
            </section>

            <section className="bg-white rounded-3xl p-5">
              <p className="text-[16px] font-extrabold text-[#1F1A2E]">O que você quer contar?</p>
              <div className="mt-3 space-y-2">
                {ASSUNTOS_APOIO.map((a) => {
                  const on = assunto === a;
                  return (
                    <button key={a} onClick={() => setAssunto(a)} aria-pressed={on}
                      className={`w-full text-left min-h-[56px] rounded-2xl px-4 py-3 text-[16px] font-semibold border-2 flex items-center gap-3 ${on ? "border-[#6D28D9] bg-[#F5F3FF] text-[#4C1D95]" : "border-[#EDE9F7] bg-white text-[#1F1A2E]"}`}>
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? "border-[#6D28D9] bg-[#6D28D9]" : "border-[#C4B5FD]"}`}>{on && <Check size={14} className="text-white" strokeWidth={3} />}</span>
                      <span className="min-w-0 break-words leading-snug">{ASSUNTO_PARA_O_ALUNO[a]}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="bg-white rounded-3xl p-5">
              <label htmlFor="relato" className="block text-[16px] font-extrabold text-[#1F1A2E]">Se quiser, conte com as suas palavras</label>
              <p className="text-[15px] text-[#5B5470] mt-1">Não precisa explicar tudo. Escreva só o que conseguir. Pode deixar em branco.</p>
              <textarea id="relato" value={texto} onChange={(e) => setTexto(e.target.value.slice(0, MAX_TEXTO_APOIO))} rows={5} autoComplete="off"
                className="mt-3 block w-full rounded-2xl border-2 border-[#EDE9F7] bg-white px-4 py-3 text-[16px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none resize-none" />

              {comAudio && (
                <div className="mt-4">
                  <p className="text-[15px] font-bold text-[#1F1A2E]">Ou grave a sua voz</p>
                  {audioUrl ? (
                    <div className="mt-2 space-y-2">
                      <audio controls src={audioUrl} className="w-full" />
                      <button onClick={apagarAudio} className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-[#F1EEF9] text-[#1F1A2E] text-[14px] font-bold"><Trash2 size={16} />Apagar gravação</button>
                    </div>
                  ) : gravando ? (
                    <button onClick={parar} className="mt-2 w-full min-h-[52px] rounded-2xl bg-[#B91C1C] text-white font-bold inline-flex items-center justify-center gap-2"><Square size={16} />Parar ({tempo})</button>
                  ) : (
                    <button onClick={gravar} className="mt-2 w-full min-h-[52px] rounded-2xl border-2 border-[#6D28D9] text-[#6D28D9] font-bold inline-flex items-center justify-center gap-2"><Mic size={18} />Gravar até 2 minutos</button>
                  )}
                </div>
              )}
            </section>

            {erro && <p role="alert" className="text-[15px] font-semibold text-[#B91C1C] px-1">{erro}</p>}
            <button onClick={enviar} disabled={!assunto || enviando || gravando}
              className="w-full min-h-[56px] rounded-2xl bg-[#6D28D9] text-white text-[16px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <Send size={18} />{enviando ? "Enviando..." : "Enviar pedido de ajuda"}
            </button>
            {!assunto && <p className="text-center text-[14px] text-[#5B5470]">Escolha uma das opções acima para enviar.</p>}
          </>
        )}

        {(fase === "form" || fase === "enviado") && (
          <section className="bg-[#FFF7E0] rounded-3xl p-5">
            <p className="flex items-center gap-2 text-[15px] font-extrabold text-[#92400E]"><Phone size={18} className="shrink-0" />Se você está em perigo agora</p>
            <ul className="mt-2 space-y-1.5 text-[15px] text-[#3B3550] leading-relaxed">
              <li>Ligue <b>190</b>.</li>
              <li>O <b>Disque 100</b> atende todos os dias, a qualquer hora, e a ligação não é cobrada.</li>
              <li>Procure um adulto de confiança perto de você.</li>
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

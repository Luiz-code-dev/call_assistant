"use client";
/**
 * Suporte da família: um assistente que tenta resolver primeiro (confere a internet,
 * sugere os passos certos para cada problema) e, se não resolver, junta as informações
 * e manda para a nossa equipe por e-mail (/api/escola/familia/suporte).
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Send, CheckCircle2, Wifi, WifiOff, User } from "lucide-react";
import FamilyShell from "@/components/escola/familia/FamilyShell";

type Msg = { de: "bot" | "voce"; texto: string; itens?: string[] };
type Etapa = "assunto" | "verificando" | "resolveu" | "descrever" | "contato" | "enviando" | "fim" | "resolvido";

const ASSUNTOS: { chave: string; texto: string; dicas: string[] }[] = [
  {
    chave: "carrega", texto: "A página não carrega ou está lenta",
    dicas: [
      "Confira se o Wi-Fi ou os dados móveis estão ligados. Tente abrir outro site para testar.",
      "Recarregue a página: puxe a tela para baixo ou toque no botão de recarregar do navegador.",
      "Feche o navegador por completo e abra de novo em www.speakflow.ia.br.",
      "Se estiver no modo economia de dados ou de bateria, desligue e tente de novo.",
    ],
  },
  {
    chave: "entrar", texto: "Meu filho não consegue entrar",
    dicas: [
      "Use o QR do cartão do aluno: ele já leva o código e só pede o PIN.",
      "Se for digitar, o código tem 8 letras e números, como ABCD-2345. Confira letra por letra no cartão.",
      "Se o PIN foi errado várias vezes, o acesso fica bloqueado por 15 minutos. Espere e tente de novo.",
      "Se ele esqueceu o PIN, abra o painel do seu filho e crie um PIN novo.",
    ],
  },
  {
    chave: "avisos", texto: "Não recebo os avisos",
    dicas: [
      "Abra Configurações no menu e veja se os avisos estão ligados.",
      "Quando o navegador perguntar, toque em Permitir notificações. Se você recusou antes, libere nas configurações do navegador.",
      "No iPhone, os avisos no celular só funcionam com o site na tela inicial: toque em Compartilhar e depois em Adicionar à Tela de Início.",
      "Procure os e-mails do SpeakFlow Escolas na caixa de spam ou promoções.",
      "Os avisos chegam entre 9h e 20h, no máximo um de cada tipo por dia.",
    ],
  },
  {
    chave: "progresso", texto: "Não vejo o progresso do meu filho",
    dicas: [
      "O painel muda quando ele termina uma etapa da trilha. Recarregue a página para ver o mais recente.",
      "Se você acompanha mais de um filho, confira se escolheu o filho certo no topo do painel.",
      "Uma resposta escrita ou falada leva alguns segundos para ser analisada. Espere um pouco e abra de novo.",
    ],
  },
  {
    chave: "cadastro", texto: "Adicionar outro filho ou responsável",
    dicas: [
      "Para outro filho, abra o menu, toque em Adicionar outro filho e use a ficha que a escola entregou para ele.",
      "Outro responsável faz o próprio cadastro com a ficha do aluno, no primeiro acesso.",
      "Cada aluno aceita até 4 responsáveis. Se passar disso, fale com a escola.",
    ],
  },
  { chave: "outro", texto: "Outro assunto", dicas: [] },
];

function aparelho(): Record<string, string> {
  const ua = navigator.userAgent;
  const so = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Outro";
  const nav = /SamsungBrowser/.test(ua) ? "Samsung Internet" : /EdgA?\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Outro";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const con = (navigator as any).connection;
  return {
    "Aparelho": so,
    "Navegador": nav,
    "Tela": `${window.screen.width}x${window.screen.height}`,
    "App na tela inicial": window.matchMedia("(display-mode: standalone)").matches ? "Sim" : "Não",
    "Notificações": typeof Notification !== "undefined" ? Notification.permission : "não suportado",
    "Conexão": con?.effectiveType ? String(con.effectiveType) : "desconhecida",
    "User agent": ua.slice(0, 380),
  };
}

async function testarInternet(): Promise<{ online: boolean; ms: number | null }> {
  if (!navigator.onLine) return { online: false, ms: null };
  const inicio = performance.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`/escola-manifest.json?t=${Date.now()}`, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    return { online: r.ok, ms: Math.round(performance.now() - inicio) };
  } catch {
    return { online: false, ms: null };
  }
}

export default function SuportePage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [etapa, setEtapa] = useState<Etapa>("assunto");
  const [assunto, setAssunto] = useState<(typeof ASSUNTOS)[number] | null>(null);
  const [descricao, setDescricao] = useState("");
  const [contato, setContato] = useState<{ nome: string; email: string; whatsapp: string } | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [rede, setRede] = useState<{ online: boolean; ms: number | null } | null>(null);
  const [erro, setErro] = useState("");
  const fim = useRef<HTMLDivElement>(null);

  const bot = (texto: string, itens?: string[]) => setMsgs((m) => [...m, { de: "bot", texto, itens }]);
  const voce = (texto: string) => setMsgs((m) => [...m, { de: "voce", texto }]);

  useEffect(() => {
    fetch("/api/escola/familia/contato", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) { setContato({ nome: d.nome ?? "", email: d.email ?? "", whatsapp: d.whatsapp ?? "" }); setWhatsapp(d.whatsapp ?? ""); }
        const ola = (d?.nome ?? "").split(" ")[0];
        setMsgs([{ de: "bot", texto: `Olá${ola ? `, ${ola}` : ""}! Sou o assistente de suporte do SpeakFlow Escolas. Vou tentar resolver com você agora. Se não der, passo para a nossa equipe. Sobre o que você precisa de ajuda?` }]);
      })
      .catch(() => setMsgs([{ de: "bot", texto: "Olá! Sou o assistente de suporte do SpeakFlow Escolas. Sobre o que você precisa de ajuda?" }]));
  }, []);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, etapa]);

  async function escolher(a: (typeof ASSUNTOS)[number]) {
    setAssunto(a); voce(a.texto); setEtapa("verificando");
    bot("Primeiro, vou conferir a sua internet...");
    const r = await testarInternet();
    setRede(r);
    if (!r.online) {
      bot("Parece que o seu aparelho está sem internet agora. Ligue o Wi-Fi ou os dados móveis e tente de novo. Muitas vezes o problema é só isso.");
    } else if (r.ms !== null && r.ms > 2500) {
      bot(`A sua internet está lenta (${(r.ms / 1000).toFixed(1)} segundos para responder). Isso pode deixar as páginas demorando. Se puder, chegue mais perto do roteador ou troque para os dados móveis.`);
    } else {
      bot(`A sua internet está funcionando bem (${r.ms ?? "?"} ms).`);
    }
    if (a.dicas.length) {
      bot("Tente estes passos:", a.dicas);
      bot("Isso resolveu?");
      setEtapa("resolveu");
    } else {
      bot("Conte com as suas palavras o que aconteceu. Quanto mais detalhe, mais rápido a gente resolve.");
      setEtapa("descrever");
    }
  }

  function resolveu(sim: boolean) {
    if (sim) {
      voce("Sim, resolveu");
      bot("Que bom! Se precisar de novo, é só voltar aqui no menu, em Suporte.");
      setEtapa("resolvido");
    } else {
      voce("Não, ainda não");
      bot("Tudo bem, vou passar para a nossa equipe. Conte com as suas palavras o que aconteceu: o que você tentou fazer, em qual tela e qual mensagem apareceu.");
      setEtapa("descrever");
    }
  }

  function confirmarDescricao() {
    if (descricao.trim().length < 5) { setErro("Escreva um pouco mais para a gente entender."); return; }
    setErro(""); voce(descricao.trim());
    bot("Como você prefere que a gente responda?");
    setEtapa("contato");
  }

  async function enviar(responderPor: "email" | "whatsapp") {
    if (responderPor === "whatsapp" && whatsapp.replace(/\D/g, "").length < 10) { setErro("Informe o seu WhatsApp com DDD."); return; }
    setErro(""); voce(responderPor === "email" ? `Por e-mail (${contato?.email})` : `Pelo WhatsApp (${whatsapp})`);
    setEtapa("enviando");
    const diag: Record<string, string> = {
      ...aparelho(),
      "Internet": rede ? (rede.online ? `ok, ${rede.ms ?? "?"} ms` : "sem internet") : "não testada",
    };
    const tentativas = assunto?.dicas ?? [];
    let r: Response | null = null;
    try {
      r = await fetch("/api/escola/familia/suporte", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assunto: assunto?.texto ?? "Outro assunto", descricao: descricao.trim(), tentativas, responderPor, whatsapp: responderPor === "whatsapp" ? whatsapp : undefined, diagnostico: diag }),
      });
    } catch { r = null; }
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      bot(d.error ?? "Não consegui enviar agora. Confira a internet e toque em enviar de novo.");
      setEtapa("contato");
      return;
    }
    bot(`Pronto! Recebemos o seu pedido, protocolo ${d.protocolo}. A nossa equipe vai responder ${responderPor === "email" ? "no seu e-mail" : "no seu WhatsApp"}. Obrigado por avisar.`);
    setEtapa("fim");
  }

  const chip = "rounded-2xl border-[1.5px] border-[#DDD6EE] bg-white hover:border-[#6D28D9] hover:bg-[#F6F4FE] text-left px-4 py-3 min-h-[48px] text-[14px] font-semibold text-[#1F1A2E] transition-colors";

  return (
    <FamilyShell titulo="Suporte" subtitulo="Tire dúvidas e fale com a nossa equipe." voltar={{ href: "/escola/familia", texto: "Painel" }}>
      <section className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#EDE9F7]">
          <span className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center"><LifeBuoy className="size-6" /></span>
          <div className="min-w-0">
            <p className="font-extrabold text-[#1F1A2E]">Assistente de suporte</p>
            <p className="text-xs text-[#5B5470] flex items-center gap-1">
              {rede === null ? "Pronto para ajudar" : rede.online ? <><Wifi className="size-3.5 text-[#15803D]" />Internet ok</> : <><WifiOff className="size-3.5 text-[#B91C1C]" />Sem internet</>}
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-3 min-h-[320px] bg-[#FBFAFF]">
          {msgs.map((m, i) => m.de === "bot" ? (
            <div key={i} className="flex items-end gap-2 max-w-[92%]">
              <span className="w-8 h-8 rounded-full bg-[#6D28D9] text-white flex items-center justify-center shrink-0"><LifeBuoy className="size-4" /></span>
              <div className="rounded-2xl rounded-bl-md bg-white border border-[#EDE9F7] px-4 py-3 text-[15px] leading-relaxed text-[#1F1A2E] shadow-sm">
                <p>{m.texto}</p>
                {m.itens && (
                  <ol className="mt-2 space-y-2">
                    {m.itens.map((t, j) => (
                      <li key={j} className="flex gap-2.5"><span className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#6D28D9] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{j + 1}</span><span>{t}</span></li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-2 justify-end">
              <div className="rounded-2xl rounded-br-md bg-[#6D28D9] text-white px-4 py-3 text-[15px] leading-relaxed max-w-[85%] whitespace-pre-wrap">{m.texto}</div>
              <span className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0"><User className="size-4" /></span>
            </div>
          ))}
          {(etapa === "verificando" || etapa === "enviando") && (
            <div className="flex items-center gap-2 pl-10 text-sm text-[#5B5470]"><span className="size-4 rounded-full border-2 border-[#EDE9FE] border-t-[#6D28D9] animate-spin" />{etapa === "enviando" ? "Enviando..." : "Conferindo..."}</div>
          )}
          <div ref={fim} />
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-[#EDE9F7] bg-white">
          {etapa === "assunto" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {ASSUNTOS.map((a) => <button key={a.chave} onClick={() => escolher(a)} className={chip}>{a.texto}</button>)}
            </div>
          )}
          {etapa === "resolveu" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => resolveu(true)} className={`${chip} text-center`}>Sim, resolveu</button>
              <button onClick={() => resolveu(false)} className="rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[48px] px-4">Não, ainda não</button>
            </div>
          )}
          {etapa === "descrever" && (
            <div className="space-y-2">
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} maxLength={3000} autoFocus
                placeholder="Ex.: meu filho digita o código do cartão e aparece Não achamos esse código."
                className="block w-full min-w-0 rounded-2xl border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none px-4 py-3 text-[15px] text-[#1F1A2E] resize-none" />
              {erro && <p className="text-sm text-[#B91C1C]">{erro}</p>}
              <button onClick={confirmarDescricao} className="w-full rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[52px] flex items-center justify-center gap-2"><Send className="size-4" />Continuar</button>
            </div>
          )}
          {etapa === "contato" && (
            <div className="space-y-3">
              {contato?.email && <button onClick={() => enviar("email")} className={`${chip} w-full`}>Por e-mail <span className="font-normal text-[#5B5470]">({contato.email})</span></button>}
              <div className="rounded-2xl border-[1.5px] border-[#DDD6EE] p-3 space-y-2">
                <label className="text-sm font-semibold text-[#1F1A2E] block">Pelo WhatsApp</label>
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} type="tel" inputMode="tel" placeholder="(71) 98765-4321"
                  className="block w-full min-w-0 rounded-xl border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] outline-none px-3 py-2.5 text-[15px] text-[#1F1A2E]" />
                <button onClick={() => enviar("whatsapp")} className="w-full rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[48px]">Responder pelo WhatsApp</button>
              </div>
              {erro && <p className="text-sm text-[#B91C1C]">{erro}</p>}
            </div>
          )}
          {(etapa === "fim" || etapa === "resolvido") && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/escola/familia" className="flex-1 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[52px] flex items-center justify-center gap-2"><CheckCircle2 className="size-5" />Voltar ao painel</Link>
              <button onClick={() => { setMsgs((m) => [...m, { de: "bot", texto: "Sobre o que mais você precisa de ajuda?" }]); setAssunto(null); setDescricao(""); setEtapa("assunto"); }}
                className={`${chip} flex-1 text-center`}>Outra dúvida</button>
            </div>
          )}
        </div>
      </section>
    </FamilyShell>
  );
}

"use client";
/**
 * Tela inicial do aluno: recado da família (elogio, lembrete, sugestão) e o horário
 * de estudo de hoje que a família combinou.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Bell, Lightbulb, Check, CalendarDays, Clock, Play } from "lucide-react";
import { materiaDe } from "@/components/escola/reforco-ui";

/**
 * Chama "carregar" ao abrir, quando a tela volta para frente, quando chega um aviso
 * (mensagem do service worker) e a cada minuto com a tela visível.
 */
function useAtualizar(carregar: () => void) {
  useEffect(() => {
    carregar();
    const visivel = () => { if (document.visibilityState === "visible") carregar(); };
    const aviso = (e: MessageEvent) => { if (e.data?.type === "sf-aviso") carregar(); };
    document.addEventListener("visibilitychange", visivel);
    window.addEventListener("focus", visivel);
    navigator.serviceWorker?.addEventListener("message", aviso);
    const t = setInterval(visivel, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", visivel);
      window.removeEventListener("focus", visivel);
      navigator.serviceWorker?.removeEventListener("message", aviso);
      clearInterval(t);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

type Tipo = "ELOGIO" | "LEMBRETE" | "SUGESTAO";
interface Recado { id: string; kind: Tipo; text: string; createdAt: string; lido: boolean; de: string }
interface ItemAgenda { id: string; weekday: number; time: string; subjectCode: string | null; minutes: number; destino?: { titulo: string; materia: string | null; subjectCode: string | null; href: string } | null }

const TIPOS: Record<Tipo, { titulo: string; Icone: typeof Heart; cor: string; fundo: string; resposta: string }> = {
  ELOGIO: { titulo: "Um elogio para você", Icone: Heart, cor: "#BE185D", fundo: "linear-gradient(135deg, #FCE7F3, #FFF1F7)", resposta: "Obrigado!" },
  LEMBRETE: { titulo: "Um lembrete", Icone: Bell, cor: "#6D28D9", fundo: "linear-gradient(135deg, #EDE9FE, #F5F3FF)", resposta: "Combinado!" },
  SUGESTAO: { titulo: "Uma sugestão", Icone: Lightbulb, cor: "#B45309", fundo: "linear-gradient(135deg, #FEF3C7, #FFFBEB)", resposta: "Vou tentar!" },
};

export function RecadoDaFamilia() {
  const [recados, setRecados] = useState<Recado[]>([]);
  useAtualizar(() => {
    fetch("/api/escola/aluno/recados", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.recados) setRecados(d.recados); }).catch(() => {});
  });
  const atual = recados.find((r) => !r.lido);
  if (!atual) return null;
  const t = TIPOS[atual.kind] ?? TIPOS.LEMBRETE;
  const outros = recados.filter((r) => !r.lido).length - 1;

  async function ler() {
    setRecados((l) => l.map((r) => (r.id === atual!.id ? { ...r, lido: true } : r)));
    await fetch("/api/escola/aluno/recados", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: atual!.id }),
    }).catch(() => {});
  }

  return (
    <section className="rounded-3xl p-4 shadow-[0_4px_18px_rgba(91,33,182,0.10)]" style={{ background: t.fundo }}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: t.cor }}>
          <t.Icone className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: t.cor }}>
            {t.titulo}{atual.de ? ` · de ${atual.de}` : " · da sua família"}
          </p>
          <p className="text-[15px] font-semibold text-[#1F1A2E] leading-snug mt-1">{atual.text}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-[#8B84A0]">{outros > 0 ? `mais ${outros} ${outros === 1 ? "recado" : "recados"}` : ""}</span>
        <button onClick={ler} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 min-h-[40px] text-[13px] font-bold shadow-sm" style={{ color: t.cor }}>
          <Check className="size-4" strokeWidth={3} />{t.resposta}
        </button>
      </div>
    </section>
  );
}

export function AgendaDeHoje() {
  const [hoje, setHoje] = useState<ItemAgenda[]>([]);
  useAtualizar(() => {
    fetch("/api/escola/aluno/agenda", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.hoje) setHoje(d.hoje); }).catch(() => {});
  });
  if (!hoje.length) return null;
  return (
    <section className="rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
      <p className="text-sm font-bold text-[#1F1A2E] mb-2 flex items-center gap-2"><CalendarDays className="size-4 text-[#6D28D9]" />Hoje na sua agenda</p>
      <ul className="space-y-2">
        {hoje.map((i) => {
          const m = materiaDe(i.destino?.subjectCode ?? i.subjectCode);
          const cor = m?.cor ?? "#6D28D9";
          const href = i.destino?.href ?? (i.subjectCode ? "/escola/aluno" : "/escola/aluno/trilha");
          return (
            <li key={i.id}>
              <Link href={href} className="flex items-center gap-3 rounded-2xl p-2.5" style={{ background: cor + "12" }}>
                <span className="rounded-xl px-2.5 py-1.5 text-[13px] font-extrabold text-white inline-flex items-center gap-1 shrink-0" style={{ background: cor }}>
                  <Clock className="size-3.5" />{i.time}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-bold text-[#1F1A2E] leading-snug line-clamp-2">{i.destino?.titulo ?? m?.nome ?? "Sua trilha"}</span>
                  <span className="block text-[12px] text-[#5B5470]">{[m?.nome ?? (i.subjectCode ? null : "Trilha do dia"), `${i.minutes} min`].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: cor }}><Play className="size-4 fill-current" /></span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function chaveParaBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

type EstadoAvisos = "carregando" | "oferecer" | "instalar-iphone" | "bloqueado" | "ativo" | "indisponivel";

/** Cartão para o aluno ativar os avisos no celular (recados da família e hora de estudar) */
export function AtivarAvisos() {
  const [estado, setEstado] = useState<EstadoAvisos>("carregando");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const instalado = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
          setEstado(ios && !instalado ? "instalar-iphone" : "indisponivel"); return;
        }
        if (Notification.permission === "denied") { setEstado("bloqueado"); return; }
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub && Notification.permission === "granted") {
          // Garante que o servidor conhece este aparelho para este aluno
          await fetch("/api/escola/aluno/avisos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) }).catch(() => {});
          setEstado("ativo"); return;
        }
        setEstado("oferecer");
      } catch { setEstado("indisponivel"); }
    })();
  }, []);

  async function ativar() {
    setOcupado(true);
    try {
      const cfg = await fetch("/api/escola/aluno/avisos").then((r) => r.json());
      if (!cfg?.disponivel || !cfg?.chave) { setEstado("indisponivel"); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setEstado(perm === "denied" ? "bloqueado" : "oferecer"); return; }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(cfg.chave) }));
      const r = await fetch("/api/escola/aluno/avisos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      setEstado(r.ok ? "ativo" : "oferecer");
    } catch {
      setEstado("oferecer");
    } finally { setOcupado(false); }
  }

  if (estado === "carregando" || estado === "ativo" || estado === "indisponivel") return null;

  return (
    <section className="rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)] flex items-start gap-3">
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center shrink-0"><Bell className="size-5" /></div>
      <div className="flex-1 min-w-0">
        {estado === "oferecer" && (<>
          <p className="text-sm font-extrabold text-[#1F1A2E]">Receba avisos no celular</p>
          <p className="text-[13px] text-[#5B5470] leading-snug mt-0.5">Recados da sua família e o lembrete da hora de estudar.</p>
          <button onClick={ativar} disabled={ocupado} className="mt-3 rounded-full bg-[#6D28D9] text-white text-[13px] font-bold px-4 min-h-[40px] disabled:opacity-50">
            {ocupado ? "Ativando..." : "Ativar avisos"}
          </button>
        </>)}
        {estado === "instalar-iphone" && (<>
          <p className="text-sm font-extrabold text-[#1F1A2E]">Avisos no iPhone</p>
          <p className="text-[13px] text-[#5B5470] leading-snug mt-0.5">Para receber os avisos, adicione o app à tela de início: toque em Compartilhar e depois em "Adicionar à Tela de Início". Abra o app por lá e ative os avisos.</p>
        </>)}
        {estado === "bloqueado" && (<>
          <p className="text-sm font-extrabold text-[#1F1A2E]">Avisos bloqueados</p>
          <p className="text-[13px] text-[#5B5470] leading-snug mt-0.5">Os avisos foram bloqueados neste celular. Peça ajuda a um adulto para liberar nas configurações do navegador.</p>
        </>)}
      </div>
    </section>
  );
}

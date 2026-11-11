"use client";
/**
 * Flow, o robozinho do reforço. Desenho original em SVG, animado só com CSS:
 * flutua, pisca, acena e mexe a boca quando está falando.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type Humor = "feliz" | "animado" | "pensando";

const CSS = `
@keyframes flow-flutua { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes flow-pisca { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(0.1) } }
@keyframes flow-acena { 0%,100% { transform: rotate(0deg) } 20% { transform: rotate(14deg) } 40% { transform: rotate(-8deg) } 60% { transform: rotate(14deg) } 80% { transform: rotate(-8deg) } }
@keyframes flow-fala { 0%,100% { transform: scaleY(0.35) } 50% { transform: scaleY(1) } }
@keyframes flow-antena { 0%,100% { transform: rotate(-6deg) } 50% { transform: rotate(6deg) } }
@keyframes flow-brilho { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
.flow-corpo { animation: flow-flutua 3.2s ease-in-out infinite; transform-box: fill-box; }
.flow-olho { animation: flow-pisca 4.5s infinite; transform-origin: center; transform-box: fill-box; }
.flow-braco-acena { transform-origin: 20% 100%; transform-box: fill-box; }
.flow-acenando .flow-braco-acena { animation: flow-acena 1.6s ease-in-out infinite; }
.flow-boca { transform-origin: center; transform-box: fill-box; }
.flow-falando .flow-boca { animation: flow-fala .28s ease-in-out infinite; }
.flow-antena { transform-origin: 50% 100%; transform-box: fill-box; animation: flow-antena 2.4s ease-in-out infinite; }
.flow-luz { animation: flow-brilho 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .flow-corpo,.flow-olho,.flow-antena,.flow-luz,.flow-acenando .flow-braco-acena,.flow-falando .flow-boca { animation: none } }
`;

export function RoboFlow({ tamanho = 140, acenando = false, falando = false, humor = "feliz", className = "" }: {
  tamanho?: number; acenando?: boolean; falando?: boolean; humor?: Humor; className?: string;
}) {
  return (
    <svg viewBox="0 0 172 170" width={tamanho} height={tamanho * 170 / 172} aria-hidden="true"
      className={`${acenando ? "flow-acenando" : ""} ${falando ? "flow-falando" : ""} ${className}`}>
      <style>{CSS}</style>
      <ellipse cx="80" cy="162" rx="40" ry="6" fill="#1F1A2E" opacity="0.10" />
      <g className="flow-corpo">
        {/* antena */}
        <g className="flow-antena">
          <rect x="77" y="10" width="6" height="18" rx="3" fill="#C4B5FD" />
          <circle className="flow-luz" cx="80" cy="10" r="8" fill="#F472B6" />
          <circle cx="77.5" cy="7.5" r="2.4" fill="#FFFFFF" opacity="0.8" />
        </g>
        {/* braço de trás */}
        <g>
          <rect x="22" y="98" width="16" height="38" rx="8" fill="#7C3AED" transform="rotate(14 30 100)" />
          <circle cx="24" cy="138" r="9" fill="#EDE9FE" />
        </g>
        {/* corpo */}
        <rect x="38" y="96" width="84" height="56" rx="22" fill="#6D28D9" />
        <rect x="38" y="96" width="84" height="26" rx="13" fill="#7C3AED" opacity="0.6" />
        <rect x="58" y="110" width="44" height="28" rx="12" fill="#FFFFFF" opacity="0.95" />
        <g fill="#6D28D9">
          <rect x="65" y="119" width="4" height="10" rx="2" />
          <rect x="72" y="115" width="4" height="18" rx="2" />
          <rect x="79" y="112" width="4" height="24" rx="2" />
          <rect x="86" y="115" width="4" height="18" rx="2" />
          <rect x="93" y="119" width="4" height="10" rx="2" />
        </g>
        {/* cabeça */}
        <rect x="26" y="26" width="108" height="76" rx="30" fill="#FFFFFF" />
        <rect x="26" y="26" width="108" height="76" rx="30" fill="none" stroke="#DDD6FE" strokeWidth="3" />
        <rect x="16" y="52" width="12" height="26" rx="6" fill="#C4B5FD" />
        <rect x="132" y="52" width="12" height="26" rx="6" fill="#C4B5FD" />
        {/* visor */}
        <rect x="38" y="38" width="84" height="52" rx="22" fill="#2E1065" />
        {humor === "pensando" ? (
          <>
            <rect className="flow-olho" x="56" y="58" width="16" height="6" rx="3" fill="#A5F3FC" />
            <rect className="flow-olho" x="88" y="54" width="16" height="14" rx="7" fill="#A5F3FC" />
          </>
        ) : (
          <>
            <ellipse className="flow-olho" cx="62" cy="60" rx="8" ry={humor === "animado" ? 10 : 9} fill="#A5F3FC" />
            <ellipse className="flow-olho" cx="98" cy="60" rx="8" ry={humor === "animado" ? 10 : 9} fill="#A5F3FC" />
            <circle cx="65" cy="56" r="2.6" fill="#FFFFFF" />
            <circle cx="101" cy="56" r="2.6" fill="#FFFFFF" />
          </>
        )}
        {/* braço que acena */}
        <g className="flow-braco-acena">
          <rect x="124" y="66" width="15" height="44" rx="7.5" fill="#7C3AED" transform="rotate(30 131.5 106)" />
          <circle cx="154" cy="66" r="10" fill="#EDE9FE" />
          <path d="M150 58 v-6 M155 57 v-7 M160 59 v-5" stroke="#EDE9FE" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle cx="48" cy="74" r="5" fill="#F472B6" opacity="0.55" />
        <circle cx="112" cy="74" r="5" fill="#F472B6" opacity="0.55" />
        {falando ? (
          <ellipse className="flow-boca" cx="80" cy="77" rx="9" ry="6" fill="#F472B6" />
        ) : humor === "pensando" ? (
          <path d="M72 78 h16" stroke="#F9A8D4" strokeWidth="4" strokeLinecap="round" />
        ) : (
          <path d="M68 74 q12 11 24 0" fill="none" stroke="#F9A8D4" strokeWidth="4" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

/** Saudação pelo horário de São Paulo/Bahia (do aparelho) */
export function saudacao(agora = new Date()): string {
  const h = agora.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Fala do Flow: usa a voz do servidor (/api/escola/aluno/tts) e cai para a voz do
 * aparelho se não der. Só toca depois de um toque do aluno (regra dos navegadores).
 */
export function useFalaDoFlow() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [falando, setFalando] = useState(false);

  const parar = useCallback(() => {
    audio.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setFalando(false);
  }, []);

  const vozDoAparelho = useCallback((t: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setFalando(false); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "pt-BR"; u.rate = 1; u.pitch = 1.2;
    u.onend = () => setFalando(false);
    u.onerror = () => setFalando(false);
    window.speechSynthesis.speak(u);
  }, []);

  const falar = useCallback(async (texto: string) => {
    parar();
    setFalando(true);
    try {
      const r = await fetch("/api/escola/aluno/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: texto }) });
      if (r.ok && r.status !== 204) {
        const url = URL.createObjectURL(await r.blob());
        if (!audio.current) audio.current = new Audio();
        audio.current.src = url;
        audio.current.onended = () => setFalando(false);
        await audio.current.play().catch(() => vozDoAparelho(texto));
        return;
      }
    } catch { /* cai para a voz do aparelho */ }
    vozDoAparelho(texto);
  }, [parar, vozDoAparelho]);

  useEffect(() => parar, [parar]);
  return { falar, parar, falando };
}

/** Texto que aparece letra por letra, como se o Flow estivesse falando */
export function useDigitando(texto: string, velocidade = 22) {
  const [visivel, setVisivel] = useState("");
  useEffect(() => {
    setVisivel("");
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVisivel(texto); return; }
    let i = 0;
    const t = setInterval(() => { i++; setVisivel(texto.slice(0, i)); if (i >= texto.length) clearInterval(t); }, velocidade);
    return () => clearInterval(t);
  }, [texto, velocidade]);
  return { visivel, terminou: visivel.length >= texto.length };
}

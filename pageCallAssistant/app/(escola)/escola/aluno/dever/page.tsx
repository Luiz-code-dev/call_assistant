"use client";
/**
 * Foto do dever da escola: o aluno fotografa, recorta só o exercício (deixando o nome de
 * fora), o Flow lê o enunciado e ajuda a pensar, sem fazer o dever. A foto não é guardada.
 */
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Crop, RefreshCw, PencilLine, Check } from "lucide-react";
import { Capa } from "@/components/escola/reforco-ui";
import { RoboFlow } from "@/components/escola/aluno/Mascote";
import ChatFlow from "@/components/escola/aluno/ChatFlow";

type Etapa = "foto" | "recortar" | "lendo" | "conversa";
type Caixa = { x: number; y: number; w: number; h: number }; // em fração da imagem (0..1)
const MAX_LADO = 1400;
const MIN = 0.12;

function clamp(v: number, a: number, b: number) { return Math.min(b, Math.max(a, v)); }

/** Recorta a caixa da imagem e reduz para no máximo 1400 px, em JPEG */
async function recortar(img: HTMLImageElement, c: Caixa): Promise<Blob> {
  const sx = c.x * img.naturalWidth, sy = c.y * img.naturalHeight, sw = c.w * img.naturalWidth, sh = c.h * img.naturalHeight;
  const esc = Math.min(1, MAX_LADO / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * esc); canvas.height = Math.round(sh * esc);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("blob"))), "image/jpeg", 0.85));
}

export default function DeverPage() {
  const [etapa, setEtapa] = useState<Etapa>("foto");
  const [url, setUrl] = useState<string | null>(null);
  const [caixa, setCaixa] = useState<Caixa>({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  const [erro, setErro] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [editando, setEditando] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ modo: "mover" | "nw" | "ne" | "sw" | "se"; px: number; py: number; c: Caixa } | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  function escolher(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErro("Escolha uma foto."); return; }
    setErro("");
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(f));
    setCaixa({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    setEtapa("recortar");
  }

  function comecar(modo: "mover" | "nw" | "ne" | "sw" | "se", e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    arrasto.current = { modo, px: e.clientX, py: e.clientY, c: caixa };
  }
  function mover(e: React.PointerEvent) {
    const a = arrasto.current, area = areaRef.current?.getBoundingClientRect();
    if (!a || !area) return;
    const dx = (e.clientX - a.px) / area.width, dy = (e.clientY - a.py) / area.height;
    let { x, y, w, h } = a.c;
    if (a.modo === "mover") { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); }
    if (a.modo === "nw" || a.modo === "sw") { const nx = clamp(x + dx, 0, x + w - MIN); w = w + (x - nx); x = nx; }
    if (a.modo === "ne" || a.modo === "se") { w = clamp(w + dx, MIN, 1 - x); }
    if (a.modo === "nw" || a.modo === "ne") { const ny = clamp(y + dy, 0, y + h - MIN); h = h + (y - ny); y = ny; }
    if (a.modo === "sw" || a.modo === "se") { h = clamp(h + dy, MIN, 1 - y); }
    setCaixa({ x, y, w, h });
  }
  function soltar() { arrasto.current = null; }

  async function ler() {
    if (!imgRef.current) return;
    setEtapa("lendo"); setErro("");
    try {
      const blob = await recortar(imgRef.current, caixa);
      const fd = new FormData();
      fd.append("foto", new File([blob], "dever.jpg", { type: "image/jpeg" }));
      const r = await fetch("/api/escola/aluno/dever/ler", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.error ?? "Não consegui ler a foto. Tente de novo."); setEtapa("recortar"); return; }
      setEnunciado(d.enunciado); setChatKey((k) => k + 1); setEtapa("conversa");
      if (url) URL.revokeObjectURL(url);
      setUrl(null); // a foto sai da memória do navegador
    } catch {
      setErro("A internet caiu. Confira a conexão e tente de novo."); setEtapa("recortar");
    }
  }

  function outraFoto() { setEtapa("foto"); setEnunciado(""); setEditando(false); setErro(""); }

  const alca = "absolute w-7 h-7 rounded-full bg-white border-[3px] border-[#6D28D9] shadow touch-none";

  return (
    <div className="min-h-screen bg-[#F6F4FE]">
      <Capa compacta titulo="Foto do dever" subtitulo="O Flow te ajuda a pensar no dever da escola" voltar={{ href: "/escola/aluno", texto: "Início" }} />
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-16">
        <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />

        {etapa !== "conversa" && (
          <section className="flex items-end gap-3 rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(91,33,182,0.12)]">
            <RoboFlow tamanho={80} acenando={etapa === "foto"} falando={etapa === "lendo"} humor={etapa === "lendo" ? "pensando" : "feliz"} />
            <p className="flex-1 rounded-3xl rounded-bl-md bg-[#F5F3FF] border border-[#E9E5F5] px-4 py-3 text-[15px] sm:text-[17px] font-bold leading-snug text-[#1F1A2E] mb-1">
              {etapa === "foto" ? "Travou no dever da escola? Tire uma foto só do exercício. Eu não faço por você, mas te ajudo a pensar!"
                : etapa === "recortar" ? "Arraste os cantos para deixar só o exercício. Se o seu nome aparecer na foto, deixe ele de fora."
                : "Estou lendo o exercício..."}
            </p>
          </section>
        )}

        {erro && <p className="rounded-2xl bg-[#FEF2F2] text-[#B91C1C] text-sm px-4 py-3">{erro}</p>}

        {etapa === "foto" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => camera.current?.click()} className="rounded-3xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[64px] flex items-center justify-center gap-2"><Camera className="size-5" />Tirar foto</button>
            <button type="button" onClick={() => galeria.current?.click()} className="rounded-3xl border-2 border-[#DDD6FE] bg-white text-[#5B21B6] font-bold min-h-[64px] flex items-center justify-center gap-2"><ImagePlus className="size-5" />Escolher da galeria</button>
            <p className="sm:col-span-2 text-xs text-[#5B5470] text-center">A foto não fica guardada. Só o texto do exercício é usado para o Flow te ajudar.</p>
          </div>
        )}

        {(etapa === "recortar" || etapa === "lendo") && url && (
          <section className="rounded-3xl bg-white p-3 shadow-[0_4px_18px_rgba(91,33,182,0.08)] space-y-3">
            <div ref={areaRef} className="relative mx-auto select-none touch-none w-fit max-w-full" onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto local (blob), sem otimização */}
              <img ref={imgRef} src={url} alt="Foto do dever" className="block max-h-[60vh] max-w-full rounded-xl" draggable={false} />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bg-black/45" style={{ left: 0, top: 0, right: 0, height: `${caixa.y * 100}%` }} />
                <div className="absolute bg-black/45" style={{ left: 0, top: `${(caixa.y + caixa.h) * 100}%`, right: 0, bottom: 0 }} />
                <div className="absolute bg-black/45" style={{ left: 0, top: `${caixa.y * 100}%`, width: `${caixa.x * 100}%`, height: `${caixa.h * 100}%` }} />
                <div className="absolute bg-black/45" style={{ left: `${(caixa.x + caixa.w) * 100}%`, top: `${caixa.y * 100}%`, right: 0, height: `${caixa.h * 100}%` }} />
              </div>
              <div className="absolute border-[3px] border-white shadow-[0_0_0_1px_#6D28D9] cursor-move touch-none"
                style={{ left: `${caixa.x * 100}%`, top: `${caixa.y * 100}%`, width: `${caixa.w * 100}%`, height: `${caixa.h * 100}%` }}
                onPointerDown={(e) => comecar("mover", e)}>
                <span className={`${alca} -left-3.5 -top-3.5`} onPointerDown={(e) => comecar("nw", e)} />
                <span className={`${alca} -right-3.5 -top-3.5`} onPointerDown={(e) => comecar("ne", e)} />
                <span className={`${alca} -left-3.5 -bottom-3.5`} onPointerDown={(e) => comecar("sw", e)} />
                <span className={`${alca} -right-3.5 -bottom-3.5`} onPointerDown={(e) => comecar("se", e)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={outraFoto} disabled={etapa === "lendo"} className="rounded-2xl border-2 border-[#DDD6FE] bg-white text-[#5B21B6] font-bold min-h-[52px] flex items-center justify-center gap-2 disabled:opacity-50"><RefreshCw className="size-4" />Outra foto</button>
              <button type="button" onClick={ler} disabled={etapa === "lendo"} className="rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[52px] flex items-center justify-center gap-2 disabled:opacity-60">
                {etapa === "lendo" ? <><RefreshCw className="size-4 animate-spin" />Lendo...</> : <><Crop className="size-4" />Usar esta parte</>}
              </button>
            </div>
          </section>
        )}

        {etapa === "conversa" && (
          <>
            <section className="rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6D28D9]">O Flow leu assim</p>
                <button type="button" onClick={() => { if (editando) setChatKey((k) => k + 1); setEditando((v) => !v); }} className="inline-flex items-center gap-1 text-[13px] font-bold text-[#6D28D9] min-h-[36px]">
                  {editando ? <><Check className="size-4" />Pronto</> : <><PencilLine className="size-4" />Corrigir</>}
                </button>
              </div>
              {editando ? (
                <textarea value={enunciado} onChange={(e) => setEnunciado(e.target.value)} rows={6} maxLength={3000}
                  className="block w-full rounded-2xl border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] outline-none px-3 py-2 text-[15px] leading-relaxed text-[#1F1A2E]" />
              ) : (
                <p className="text-[15px] leading-relaxed text-[#1F1A2E] whitespace-pre-wrap max-h-48 overflow-y-auto">{enunciado}</p>
              )}
            </section>
            {!editando && (
              <section className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] overflow-hidden h-[min(62dvh,560px)] flex flex-col">
                <div className="flex items-center gap-2.5 px-3 py-2 bg-gradient-to-br from-[#5B21B6] via-[#6D28D9] to-[#8B5CF6] text-white shrink-0">
                  <span className="w-9 h-9 rounded-xl bg-white/95 flex items-center justify-center overflow-hidden"><RoboFlow tamanho={34} /></span>
                  <div className="flex-1 min-w-0"><p className="font-extrabold text-[15px] leading-tight">Flow</p><p className="text-[11px] text-white/85">Te ajudo a pensar. A resposta é sua!</p></div>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatFlow key={chatKey} contexto={{ dever: { enunciado } }} compacto={false}
                    saudacaoInicial="Li o seu dever! Eu não vou fazer por você, mas te ajudo a pensar. Por qual parte você quer começar?" />
                </div>
              </section>
            )}
            <button type="button" onClick={outraFoto} className="w-full rounded-2xl border-2 border-[#DDD6FE] bg-white text-[#5B21B6] font-bold min-h-[52px] flex items-center justify-center gap-2"><Camera className="size-4" />Fotografar outro exercício</button>
          </>
        )}
      </main>
    </div>
  );
}

"use client";
/**
 * Foto da redação do caderno: o aluno fotografa (até 3 folhas) e o Flow copia o texto
 * do jeito que está escrito, sem corrigir, para o aluno conferir antes de enviar.
 * A foto é reduzida no próprio celular e não fica guardada.
 */
import { useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw } from "lucide-react";

const MAX_LADO = 1800;

async function reduzir(f: File): Promise<Blob> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const esc = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * esc); c.height = Math.round(img.naturalHeight * esc);
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((ok, erro) => c.toBlob((b) => (b ? ok(b) : erro(new Error("blob"))), "image/jpeg", 0.85));
  } finally { URL.revokeObjectURL(url); }
}

export default function FotoDaRedacao({ aoLer }: { aoLer: (texto: string, titulo: string | null) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(lista: FileList | null) {
    const arquivos = Array.from(lista ?? []).filter((f) => f.type.startsWith("image/")).slice(0, 3);
    if (!arquivos.length) return;
    setLendo(true); setErro("");
    try {
      const fd = new FormData();
      for (let i = 0; i < arquivos.length; i++) fd.append("foto", new File([await reduzir(arquivos[i])], `folha-${i + 1}.jpg`, { type: "image/jpeg" }));
      const r = await fetch("/api/escola/aluno/redacoes/transcrever", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.error ?? "Não consegui ler a foto. Tente de novo."); return; }
      aoLer(d.texto, d.titulo ?? null);
    } catch {
      setErro("A internet caiu. Confira a conexão e tente de novo.");
    } finally { setLendo(false); }
  }

  return (
    <div className="space-y-2">
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { enviar(e.target.files); e.target.value = ""; }} />
      <input ref={galeria} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { enviar(e.target.files); e.target.value = ""; }} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={lendo} onClick={() => camera.current?.click()} className="rounded-2xl border-2 border-[#DDD6FE] bg-white text-[#5B21B6] font-bold min-h-[52px] flex items-center justify-center gap-2 disabled:opacity-60">
          {lendo ? <RefreshCw className="size-4 animate-spin" /> : <Camera className="size-4" />}{lendo ? "Lendo..." : "Foto do caderno"}
        </button>
        <button type="button" disabled={lendo} onClick={() => galeria.current?.click()} className="rounded-2xl border-2 border-[#DDD6FE] bg-white text-[#5B21B6] font-bold min-h-[52px] flex items-center justify-center gap-2 disabled:opacity-60">
          <ImagePlus className="size-4" />Da galeria
        </button>
      </div>
      <p className="text-xs text-[#5B5470] text-center">Escreveu no caderno? Tire uma foto (até 3 folhas). O Flow copia do jeito que está escrito, sem corrigir. A foto não fica guardada.</p>
      {erro && <p className="rounded-2xl bg-[#FEF2F2] text-[#B91C1C] text-sm px-4 py-3">{erro}</p>}
    </div>
  );
}

"use client";
/**
 * Leitor de QR pela câmera, em tela cheia. Usa BarcodeDetector quando existe
 * (Chrome/Android, Safari 17.4+) e cai para jsqr nos outros navegadores.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, AlertCircle, KeyRound } from "lucide-react";

type Props = {
  titulo?: string;
  dica?: string;
  textoDigitar?: string;
  onCancelar: () => void;
  onLido: (texto: string) => void;
  onDigitar: () => void;
};

export default function LeitorQR({ titulo = "Ler QR code", dica = "Aponte a câmera para o QR da ficha", textoDigitar = "Digitar o código", onCancelar, onLido, onDigitar }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lidoRef = useRef(onLido);
  lidoRef.current = onLido;
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);

  useEffect(() => {
    let parado = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    const canvas = document.createElement("canvas");

    function parar() {
      parado = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    }

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) { setErro("Este navegador não abre a câmera. Digite o código da ficha."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (parado) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        setLendo(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const W = window as any;
        const detector = "BarcodeDetector" in W ? new W.BarcodeDetector({ formats: ["qr_code"] }) : null;
        const jsQR = detector ? null : (await import("jsqr").catch(() => null))?.default ?? null;

        const quadro = async () => {
          if (parado) return;
          if (v.readyState >= 2 && v.videoWidth) {
            let texto: string | null = null;
            if (detector) {
              try { const r = await detector.detect(v); if (r.length) texto = r[0].rawValue; } catch { /* tenta no próximo quadro */ }
            } else if (jsQR) {
              canvas.width = v.videoWidth; canvas.height = v.videoHeight;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(v, 0, 0);
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                texto = jsQR(img.data, img.width, img.height)?.data ?? null;
              }
            }
            if (texto && !parado) { parar(); lidoRef.current(texto); return; }
          }
          raf = requestAnimationFrame(quadro);
        };
        quadro();
      } catch {
        if (!parado) setErro("Não conseguimos abrir a câmera. Libere a câmera no navegador ou digite o código da ficha.");
      }
    }

    iniciar();
    return parar;
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#1F1A2E] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={onCancelar} className="text-white/80 flex items-center gap-1 text-sm min-h-[44px]"><ChevronLeft size={16} /> Voltar</button>
          <span className="text-white font-semibold">{titulo}</span>
          <div className="w-16" />
        </div>
        {erro ? (
          <div className="bg-white rounded-2xl p-6 text-center">
            <AlertCircle className="mx-auto mb-3 text-[#B91C1C]" size={32} />
            <p className="text-[#1F1A2E] text-sm mb-4">{erro}</p>
            <button type="button" onClick={onDigitar} className="w-full bg-[#6D28D9] text-white py-3 rounded-xl font-semibold text-sm min-h-[48px]">{textoDigitar}</button>
          </div>
        ) : (
          <>
            <div className="relative rounded-2xl overflow-hidden aspect-square bg-black mb-4">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {lendo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-52 h-52 border-4 border-white/70 rounded-2xl" />
                </div>
              )}
            </div>
            <p className="text-white/70 text-sm text-center mb-4">{dica}</p>
            <button type="button" onClick={onDigitar} className="w-full border border-white/30 text-white/90 py-3 rounded-xl text-sm font-semibold min-h-[48px]">
              <KeyRound size={14} className="inline mr-1.5" />{textoDigitar}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Tira o código de família de um QR: aceita o link com ?codigo= ou o código puro. */
export function codigoDoQR(texto: string): string {
  let bruto = texto.trim();
  try {
    const u = new URL(bruto);
    bruto = u.searchParams.get("codigo") ?? "";
  } catch { /* não é link: é o código puro */ }
  return bruto.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

/** Máscara ABCD-2345: só letras e números, no máximo 8, com o traço depois do 4º. */
export function mascaraCodigo(valor: string): string {
  const c = valor.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

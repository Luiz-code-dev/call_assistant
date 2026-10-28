"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CardData {
  num: number;
  name: string;
  loginMode: string;
  qrUrl: string;
}
interface PageData {
  className: string;
  gradeYear: number;
  shift: string;
  schoolName: string;
  cards: CardData[];
}

export default function CartoesPage({ params }: { params: { classId: string } }) {
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/escola/turmas/${params.classId}/cartoes`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Erro ao carregar cartões."));
  }, [params.classId]);

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-[#B91C1C] mb-4">{error}</p>
      <Link href="/escola/professor" className="text-[#6D28D9] underline">Voltar</Link>
    </div>
  );
  if (!data) return <div className="p-8 text-center text-[#5B5470]">Gerando cartões...</div>;

  return (
    <>
      {/* Barra de ação — oculta na impressão */}
      <div className="print:hidden bg-white border-b border-[#E9E5F5] px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/escola/professor" className="text-[#6D28D9] flex items-center gap-1 text-sm font-semibold min-h-[44px]">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <span className="text-[#1F1A2E] font-semibold">{data.className} — Cartões de acesso</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] transition-colors"
        >
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* Instrução — oculta na impressão */}
      <div className="print:hidden bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-sm px-6 py-3 text-center">
        Use <strong>Imprimir / Salvar PDF</strong> · Papel A4 · Margens mínimas · Escala 100% · Marque &ldquo;Gráficos de fundo&rdquo;
      </div>

      {/* Grade de cartões — 2 colunas × 4 linhas por página A4 */}
      <div className="p-4 bg-white min-h-screen">
        <style>{`
          @media print {
            @page { size: A4; margin: 10mm; }
            body { background: white !important; }
            .card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; }
            .card { break-inside: avoid; page-break-inside: avoid; }
          }
          @media screen {
            .card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 794px; margin: 0 auto; padding: 16px; }
          }
        `}</style>
        <div className="card-grid">
          {data.cards.map(card => (
            <div key={card.num} className="card" style={{ width: "85.6mm", minHeight: "54mm", border: "0.5mm solid #E9E5F5", borderRadius: "3mm", padding: "4mm", display: "flex", flexDirection: "column", gap: "3mm", background: "#fff", boxSizing: "border-box" }}>
              {/* Frente do cartão */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "4mm" }}>
                <div style={{ flexShrink: 0 }}>
                  <QRCodeSVG value={card.qrUrl} size={80} level="M" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "7pt", fontWeight: 700, color: "#6D28D9", marginBottom: "1mm" }}>SpeakFlow Escolas</div>
                  <div style={{ fontSize: "9pt", fontWeight: 800, color: "#1F1A2E", lineHeight: 1.2, marginBottom: "1.5mm", wordBreak: "break-word" }}>{card.name}</div>
                  <div style={{ fontSize: "7pt", color: "#5B5470" }}>{data.className} · {data.shift}</div>
                  <div style={{ fontSize: "7pt", color: "#5B5470" }}>{data.schoolName}</div>
                  <div style={{ fontSize: "6.5pt", color: "#5B5470", marginTop: "1.5mm" }}>No app: Sou aluno › Ler meu cartão</div>
                  <div style={{ fontSize: "6pt", color: "#9CA3AF" }}>Cartão #{card.num} · v{String(card.num)}</div>
                </div>
              </div>
              {/* Verso (lado inferior separado por linha) */}
              <div style={{ borderTop: "0.3mm dashed #DDD6EE", paddingTop: "2mm" }}>
                <div style={{ fontSize: "6.5pt", fontWeight: 700, color: "#1F1A2E", marginBottom: "1mm" }}>Para a família</div>
                <div style={{ fontSize: "6pt", color: "#5B5470", lineHeight: 1.4 }}>
                  1. Instale o app SpeakFlow Escolas.<br/>
                  2. Toque em &quot;Sou aluno&quot; → &quot;Ler meu cartão&quot;.<br/>
                  3. Aponte a câmera para o QR acima.<br/>
                  4. Digite a senha (entregue pela escola).<br/>
                  <strong style={{ color: "#B91C1C" }}>A senha não vem no cartão. Perdeu? Avise a escola para bloquear.</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

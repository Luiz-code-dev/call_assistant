"use client";
/**
 * Fichas de acesso do reforço, para imprimir e a escola entregar às famílias
 * (na matrícula ou colada na agenda do aluno). Uma ficha por aluno:
 * - QR da família: o responsável lê, confirma o filho com a data de nascimento e cria o acesso
 * - código do aluno: o aluno digita em "Entrar" junto com o PIN
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ChevronLeft, AlertTriangle } from "lucide-react";

interface Turma { id: string; nome: string; ano: number; escola: string; alunos: number }
interface Ficha { aluno: string; semDataNascimento: boolean; codigoAluno: string; codigoFamilia: string; linkFamilia: string; validade: string }
interface Lote { turma: string; ano: number; escola: string; entrarAluno: string; fichas: Ficha[] }

export default function FichasDeAcesso() {
  const { id } = useParams<{ id: string }>();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [lote, setLote] = useState<Lote | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/escola/plataforma/redes/${id}/fichas`).then((r) => (r.ok ? r.json() : null))
      .then((d) => { setTurmas(d?.turmas ?? []); if (d?.turmas?.[0]) setTurmaId(d.turmas[0].id); })
      .catch(() => setErro("Não foi possível carregar as turmas."));
  }, [id]);

  async function gerar() {
    if (!confirm("Gerar fichas novas para esta turma? As fichas impressas antes deixam de valer para quem ainda não se cadastrou. Quem já tem acesso continua normalmente.")) return;
    setCarregando(true); setErro("");
    const r = await fetch(`/api/escola/plataforma/redes/${id}/fichas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turmaId }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setCarregando(false);
    if (!r?.ok) { setErro(d.error ?? "Não foi possível gerar as fichas."); return; }
    setLote(d);
  }

  const semData = lote?.fichas.filter((f) => f.semDataNascimento).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="print:hidden max-w-4xl mx-auto px-6 py-6 space-y-4">
        <Link href={`/escola/plataforma/redes/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600"><ChevronLeft size={16} />Voltar para a rede</Link>
        <h1 className="text-2xl font-extrabold text-gray-900">Fichas de acesso do reforço</h1>
        <p className="text-sm text-gray-600 max-w-2xl">Uma ficha por aluno, para a escola entregar à família na matrícula ou colar na agenda. O responsável lê o QR, confirma o filho com a data de nascimento e cria o acesso. O aluno entra com o código dele e o PIN.</p>
        <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl border border-gray-200 p-4">
          <label className="text-sm font-semibold text-gray-700">Turma
            <select value={turmaId} onChange={(e) => { setTurmaId(e.target.value); setLote(null); }} className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 min-w-[260px] font-normal">
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome} · {t.escola} ({t.alunos} {t.alunos === 1 ? "aluno" : "alunos"})</option>)}
            </select>
          </label>
          <button onClick={gerar} disabled={!turmaId || carregando} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-4 min-h-[42px] disabled:opacity-50">{carregando ? "Gerando..." : "Gerar fichas"}</button>
          {lote && <button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-indigo-600 text-indigo-600 font-semibold rounded-lg px-4 min-h-[42px]"><Printer size={16} />Imprimir ou salvar em PDF</button>}
        </div>
        {erro && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
        {semData > 0 && (
          <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" />
            {semData} {semData === 1 ? "aluno está" : "alunos estão"} sem data de nascimento no cadastro. A família desses alunos só consegue criar o acesso depois que a escola informar a data.</p>
        )}
      </div>

      {lote && (
        <div className="max-w-4xl mx-auto px-6 pb-10 print:p-0 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 print:gap-3">
          {lote.fichas.map((f) => (
            <div key={f.codigoFamilia} className="bg-white rounded-2xl border-2 border-dashed border-violet-300 p-4 break-inside-avoid">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-violet-700">SpeakFlow Escolas · Reforço</span>
                <span className="text-[11px] text-gray-500 truncate">{lote.escola}</span>
              </div>
              <p className="text-[17px] font-extrabold text-gray-900 leading-tight">{f.aluno}</p>
              <p className="text-[12px] text-gray-600 mb-3">{lote.turma}</p>
              <div className="flex gap-3">
                <div className="shrink-0 text-center">
                  <QRCodeSVG value={f.linkFamilia} size={112} level="M" />
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">{f.codigoFamilia}</p>
                </div>
                <div className="text-[12px] text-gray-800 leading-snug space-y-2 min-w-0">
                  <p><b>Responsável:</b> leia o QR com a câmera do celular e crie o seu acesso para acompanhar o reforço. Vai pedir a data de nascimento do aluno.</p>
                  <div className="rounded-lg bg-violet-50 px-2 py-1.5">
                    <p className="text-[11px] text-violet-800 font-semibold">Código do aluno para entrar</p>
                    <p className="text-[16px] font-extrabold font-mono tracking-wider text-violet-900">{f.codigoAluno}</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">O aluno entra em {lote.entrarAluno.replace(/^https?:\/\//, "")} com este código e o PIN. O QR da família vale até {new Date(f.validade).toLocaleDateString("pt-BR")}.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

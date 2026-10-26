"use client";
import { useEffect, useRef, useState } from "react";

type ImportKind = "escolas" | "servidores" | "alunos" | "atribuicoes";
type BatchStatus = "UPLOADED" | "PREVIEW" | "PROCESSING" | "DONE" | "FAILED" | "CANCELLED";

interface Batch {
  id: string; kind: string; status: BatchStatus; fileName: string;
  totalRows: number; processed: number; created: number; updated: number; failed: number;
  createdAt: string; finishedAt: string | null;
}

interface PreviewResult {
  batchId: string; totalRows: number; validRows: number; invalidRows: number;
  validationErrors: { row: number; field: string; message: string }[];
  headers: string[];
}

const KIND_LABEL: Record<ImportKind, string> = { escolas: "Escolas", servidores: "Servidores", alunos: "Turmas e Alunos", atribuicoes: "Atribuições" };
const STATUS_COLOR: Record<BatchStatus, string> = { UPLOADED: "text-[#1D4ED8]", PREVIEW: "text-[#92400E]", PROCESSING: "text-[#1D4ED8]", DONE: "text-[#166534]", FAILED: "text-[#B91C1C]", CANCELLED: "text-[#5B5470]" };
const STATUS_LABEL: Record<BatchStatus, string> = { UPLOADED: "Enviado", PREVIEW: "Pré-visualização", PROCESSING: "Processando...", DONE: "Concluído", FAILED: "Falhou", CANCELLED: "Cancelado" };

export default function ImportacoesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [kind, setKind] = useState<ImportKind>("alunos");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadBatches() {
    const r = await fetch("/api/escola/importacoes");
    const data = await r.json();
    setBatches(data.batches ?? []);
  }
  useEffect(() => { loadBatches(); }, []);

  // Poll processing batches
  useEffect(() => {
    const processing = batches.filter(b => b.status === "PROCESSING");
    if (processing.length === 0) return;
    const t = setInterval(() => loadBatches(), 2000);
    return () => clearInterval(t);
  }, [batches]);

  async function upload() {
    if (!file) return;
    setUploading(true); setError(""); setPreview(null);
    const fd = new FormData();
    fd.append("file", file); fd.append("kind", kind);
    const r = await fetch("/api/escola/importacoes", { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setUploading(false); return; }
    setPreview(data);
    loadBatches();
    setUploading(false);
  }

  async function confirm() {
    if (!preview) return;
    setConfirming(true); setError("");
    const r = await fetch(`/api/escola/importacoes/${preview.batchId}/confirmar`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setConfirming(false); return; }
    setPreview(null); setFile(null); if (fileRef.current) fileRef.current.value = "";
    loadBatches();
    setConfirming(false);
  }

  function downloadTemplate() {
    window.open(`/api/escola/importacoes/modelo?tipo=${kind.toUpperCase().replace("SERVIDORES", "STAFF").replace("ESCOLAS", "SCHOOLS").replace("ALUNOS", "STUDENTS").replace("ATRIBUICOES", "ASSIGNMENTS")}`, "_blank");
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-2">Importação em massa</h1>
      <p className="text-[#5B5470] text-sm mb-6">Importe escolas, servidores, turmas/alunos e atribuições via planilha CSV ou XLSX.</p>

      {/* Upload card */}
      <div className="bg-white border border-[#E9E5F5] rounded-xl p-5 mb-6">
        <h2 className="text-[#1F1A2E] font-semibold mb-4">Nova importação</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          {(Object.keys(KIND_LABEL) as ImportKind[]).map(k => (
            <button key={k} onClick={() => { setKind(k); setPreview(null); }} className={`px-4 py-2 rounded-lg text-sm min-h-[44px] transition-colors ${kind === k ? "bg-purple-700 text-white" : "bg-[#FAF9FD] text-[#5B5470] hover:text-[#1F1A2E]"}`}>{KIND_LABEL[k]}</button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <button onClick={downloadTemplate} className="text-purple-400 hover:text-purple-300 text-sm underline min-h-[44px] flex items-center transition-colors">⬇ Baixar modelo {KIND_LABEL[kind]}</button>
        </div>

        <div className="border-2 border-dashed border-[#DDD6EE] rounded-xl p-6 text-center mb-4 cursor-pointer hover:border-purple-600 transition-colors" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null); setError(""); }} />
          {file ? (
            <div className="text-[#1F1A2E]"><div className="text-2xl mb-1">📄</div><div className="font-medium">{file.name}</div><div className="text-[#5B5470] text-xs">{(file.size / 1024).toFixed(1)} KB</div></div>
          ) : (
            <div className="text-[#5B5470]"><div className="text-3xl mb-2">📤</div><div>Clique ou arraste um arquivo CSV/XLSX</div><div className="text-xs mt-1">Máx. 20 MB</div></div>
          )}
        </div>

        {error && <p className="text-[#B91C1C] text-sm mb-3">{error}</p>}

        <button onClick={upload} disabled={!file || uploading} className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl min-h-[44px] transition-colors">
          {uploading ? "Validando..." : "Validar e pré-visualizar"}
        </button>
      </div>

      {/* Preview result */}
      {preview && (
        <div className="bg-white border border-[#E9E5F5] rounded-xl p-5 mb-6">
          <h2 className="text-[#1F1A2E] font-semibold mb-3">Resultado da validação</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#FAF9FD] rounded-lg p-3 text-center"><div className="text-2xl font-bold text-[#1F1A2E]">{preview.totalRows}</div><div className="text-[#5B5470] text-xs">Total de linhas</div></div>
            <div className="bg-[#DCFCE7] rounded-lg p-3 text-center"><div className="text-2xl font-bold text-[#166534]">{preview.validRows}</div><div className="text-[#5B5470] text-xs">Válidas</div></div>
            <div className="bg-[#FEE2E2] rounded-lg p-3 text-center"><div className="text-2xl font-bold text-[#B91C1C]">{preview.invalidRows}</div><div className="text-[#5B5470] text-xs">Com erro</div></div>
          </div>

          {preview.validationErrors.length > 0 && (
            <div className="bg-[#FAF9FD] rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
              <div className="text-[#5B5470] text-xs font-medium mb-2">Erros encontrados (máx. 100 exibidos):</div>
              {preview.validationErrors.map((e, i) => (
                <div key={i} className="text-[#B91C1C] text-xs py-0.5">Linha {e.row}: {e.field ? `[${e.field}] ` : ""}{e.message}</div>
              ))}
            </div>
          )}

          {preview.validRows > 0 ? (
            <button onClick={confirm} disabled={confirming} className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl min-h-[44px] transition-colors">
              {confirming ? "Iniciando..." : `Importar ${preview.validRows} linha${preview.validRows !== 1 ? "s" : ""} válida${preview.validRows !== 1 ? "s" : ""}`}
            </button>
          ) : (
            <p className="text-[#B91C1C] text-sm text-center">Nenhuma linha válida para importar.</p>
          )}
        </div>
      )}

      {/* Batch history */}
      <h2 className="text-[#1F1A2E] font-semibold mb-3">Histórico de importações</h2>
      {batches.length === 0 ? (
        <div className="text-[#5B5470] text-center py-8">Nenhuma importação realizada.</div>
      ) : (
        <div className="space-y-2">
          {batches.map(b => (
            <div key={b.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#1F1A2E] font-medium text-sm truncate max-w-xs">{b.fileName}</span>
                  <span className={`text-xs font-medium ${STATUS_COLOR[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                  <span className="text-[#5B5470] text-xs">{KIND_LABEL[b.kind.toLowerCase() as ImportKind] ?? b.kind}</span>
                </div>
                <div className="text-[#5B5470] text-xs mt-1">
                  {b.totalRows} linhas · +{b.created} criados · ~{b.updated} atualizados · {b.failed} erros
                </div>
                {b.status === "PROCESSING" && (
                  <div className="mt-2 bg-[#FAF9FD] rounded-full h-1.5 w-full max-w-xs">
                    <div className="bg-purple-600 h-1.5 rounded-full transition-all" style={{ width: `${b.totalRows > 0 ? Math.round((b.processed / b.totalRows) * 100) : 0}%` }} />
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {b.status === "PREVIEW" && (
                  <button onClick={() => fetch(`/api/escola/importacoes/${b.id}/confirmar`, { method: "POST" }).then(loadBatches)}
                    className="text-xs text-[#166534] hover:text-green-300 min-h-[44px] flex items-center px-2 transition-colors">Confirmar</button>
                )}
                {b.status === "DONE" && b.failed > 0 && (
                  <a href={`/api/escola/importacoes/${b.id}/relatorio`} className="text-xs text-[#5B5470] hover:text-[#3F3A4F] min-h-[44px] flex items-center px-2 transition-colors">⬇ Relatório</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

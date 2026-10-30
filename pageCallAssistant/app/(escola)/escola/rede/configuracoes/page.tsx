"use client";
import { useState, useEffect } from "react";
import { Settings } from "lucide-react";

interface Config { id: string; name: string; trackAssignmentMode: string; diagnosticAdaptive: boolean; requireTrackApproval: boolean; }

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escola/rede/configuracoes", { credentials: "include" })
      .then(r => r.json()).then(d => { setConfig(d.network); setLoading(false); })
      .catch(() => { setError("Erro ao carregar configurações."); setLoading(false); });
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true); setSaved(false); setError("");
    const r = await fetch("/api/escola/rede/configuracoes", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackAssignmentMode: config.trackAssignmentMode, diagnosticAdaptive: config.diagnosticAdaptive, requireTrackApproval: config.requireTrackApproval }),
    });
    if (r.ok) { setSaved(true); } else { const d = await r.json(); setError(d.error ?? "Erro ao salvar."); }
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-center text-[#5B5470]">Carregando...</div>;
  if (!config) return <div className="p-8 text-center text-[#B91C1C]">{error || "Erro."}<button onClick={() => window.location.reload()} className="text-[#6D28D9] ml-2 underline text-sm">Tentar novamente</button></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-[#6D28D9]" />
        <h1 className="text-2xl font-bold text-[#1F1A2E]">Configurações da rede</h1>
      </div>

      {error && <div className="bg-[#FEE2E2] border border-[#B91C1C]/20 rounded-lg p-3 text-[#B91C1C] text-sm mb-4">{error}</div>}
      {saved && <div className="bg-[#DCFCE7] border border-[#166534]/20 rounded-lg p-3 text-[#166534] text-sm mb-4">Configurações salvas.</div>}

      <div className="space-y-6">
        <div className="bg-white border border-[#E9E5F5] rounded-xl p-5">
          <div className="font-semibold text-[#1F1A2E] mb-1">Atribuição de trilha após diagnóstico</div>
          <div className="text-[#5B5470] text-sm mb-3">Define o que acontece automaticamente quando um aluno finaliza um diagnóstico.</div>
          <select value={config.trackAssignmentMode} onChange={e => setConfig({ ...config, trackAssignmentMode: e.target.value })}
            className="w-full h-[48px] border border-[#DDD6EE] rounded-lg px-3 text-[#1F1A2E] bg-white outline-none focus:border-[#6D28D9] text-sm">
            <option value="SUGGEST">Sugerir ao professor (padrão)</option>
            <option value="AUTO">Automático — atribuir diretamente ao aluno</option>
          </select>
        </div>

        <div className="bg-white border border-[#E9E5F5] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#1F1A2E]">Diagnóstico com degrau</div>
              <div className="text-[#5B5470] text-sm mt-1">Se o aluno erra uma habilidade, inclui automaticamente itens do pré-requisito para identificar a lacuna.</div>
            </div>
            <button onClick={() => setConfig({ ...config, diagnosticAdaptive: !config.diagnosticAdaptive })}
              className={`w-12 h-6 rounded-full transition-colors ${config.diagnosticAdaptive ? "bg-[#6D28D9]" : "bg-[#DDD6EE]"}`}>
              <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${config.diagnosticAdaptive ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E9E5F5] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#1F1A2E]">Exigir aprovação de trilha</div>
              <div className="text-[#5B5470] text-sm mt-1">Trilhas criadas por professores precisam ser aprovadas pela coordenação antes de serem usadas.</div>
            </div>
            <button onClick={() => setConfig({ ...config, requireTrackApproval: !config.requireTrackApproval })}
              className={`w-12 h-6 rounded-full transition-colors ${config.requireTrackApproval ? "bg-[#6D28D9]" : "bg-[#DDD6EE]"}`}>
              <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${config.requireTrackApproval ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="mt-6 w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white py-3 rounded-lg font-semibold min-h-[44px] disabled:opacity-50 transition-colors">
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  );
}

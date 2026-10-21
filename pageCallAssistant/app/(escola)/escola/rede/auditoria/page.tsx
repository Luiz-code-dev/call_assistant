"use client";
import { useEffect, useState } from "react";

interface AuditLog { id: string; actorType: string; actorId: string; action: string; entity: string; entityId: string; metadata: Record<string,unknown> | null; ip: string | null; createdAt: string; }

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (entity) params.set("entity", entity);
    const r = await fetch(`/api/escola/auditoria?${params}`);
    const data = await r.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [action, entity]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Auditoria</h1>
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={action} onChange={e => setAction(e.target.value)} placeholder="Filtrar por ação..." className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 outline-none min-h-[44px] w-48" />
        <input value={entity} onChange={e => setEntity(e.target.value)} placeholder="Filtrar por entidade..." className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 outline-none min-h-[44px] w-48" />
        <button onClick={load} className="bg-gray-800 text-gray-300 hover:text-white rounded-lg px-4 py-2 text-sm border border-gray-700 min-h-[44px] transition-colors">Atualizar</button>
      </div>
      {loading ? <div className="text-gray-400 text-center py-12">Carregando...</div> : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-500"><div className="text-4xl mb-3">🔍</div><div>Nenhum registro encontrado</div></div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-mono text-sm font-medium">{log.action}</span>
                  <span className="text-gray-600 text-xs">em</span>
                  <span className="text-gray-400 text-sm">{log.entity}</span>
                </div>
                <span className="text-gray-600 text-xs shrink-0">{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
              </div>
              <div className="text-gray-500 text-xs">
                <span className="capitalize">{log.actorType}</span>: <span className="font-mono">{log.actorId.slice(0, 8)}…</span>
                {log.ip && <span className="ml-3">IP: {log.ip}</span>}
              </div>
              {log.metadata && <div className="mt-2 text-xs text-gray-600 font-mono bg-gray-800 rounded px-2 py-1 overflow-x-auto">{JSON.stringify(log.metadata)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

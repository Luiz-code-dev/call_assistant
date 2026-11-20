"use client";
import { useCallback, useEffect, useState } from "react";
import { Plug, Copy, Check, Trash2, Send } from "lucide-react";

interface Chave { id: string; name: string; prefix: string; scopes: string[]; allowedIps: string[]; fieldMap: Record<string, string> | null; createdAt: string; expiresAt: string | null; lastUsedAt: string | null; revokedAt: string | null }
interface Endereco { id: string; url: string; events: string[]; isActive: boolean; failCount: number; lastDeliveryAt: string | null; lastStatus: string | null }
interface Registro { id: string; keyId: string | null; direction: string; resource: string; status: string; received: number; created: number; updated: number; failed: number; errors: { item: number; campo: string; mensagem: string }[] | null; createdAt: string }
interface Dados { chaves: Chave[]; enderecos: Endereco[]; historico: Registro[]; escopos: Record<string, string>; eventos: Record<string, string> }

const CARTAO = "bg-white border border-[#E9E5F5] rounded-xl p-5";
const CAMPO = "w-full h-[44px] border border-[#DDD6EE] rounded-lg px-3 text-[#1F1A2E] bg-white outline-none focus:border-[#6D28D9] text-sm";
const BOTAO = "h-[44px] px-4 rounded-lg bg-[#6D28D9] text-white text-sm font-semibold disabled:opacity-50";
const data = (v: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "nunca");
const STATUS: Record<string, { texto: string; cor: string }> = {
  OK: { texto: "Concluído", cor: "bg-[#DCFCE7] text-[#166534]" },
  PARTIAL: { texto: "Com recusas", cor: "bg-[#FEF3C7] text-[#92400E]" },
  ERROR: { texto: "Recusado", cor: "bg-[#FEE2E2] text-[#B91C1C]" },
};

/** "campo_deles = campo_nosso", um por linha → objeto */
function lerDePara(texto: string): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const linha of texto.split("\n")) {
    const [de, para] = linha.split("=").map((s) => s.trim());
    if (de && para) mapa[de] = para;
  }
  return mapa;
}

function Segredo({ titulo, valor, aviso }: { titulo: string; valor: string; aviso: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="bg-[#FEF3C7] border border-[#92400E]/20 rounded-xl p-4 mb-4">
      <p className="font-semibold text-[#92400E] text-sm">{titulo}</p>
      <p className="text-[#92400E] text-sm mt-1">{aviso}</p>
      <div className="flex items-center gap-2 mt-3">
        <code className="flex-1 min-w-0 break-all bg-white border border-[#92400E]/20 rounded-lg px-3 py-2 text-xs text-[#1F1A2E]">{valor}</code>
        <button
          onClick={() => { navigator.clipboard?.writeText(valor).then(() => setCopiado(true)).catch(() => null); }}
          className="h-[40px] px-3 rounded-lg border border-[#92400E]/30 text-[#92400E] text-sm flex items-center gap-1.5 shrink-0"
        >
          {copiado ? <Check size={15} /> : <Copy size={15} />}{copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export default function IntegracoesPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [chaveNova, setChaveNova] = useState("");
  const [segredoNovo, setSegredoNovo] = useState("");

  const [nome, setNome] = useState("");
  const [escopos, setEscopos] = useState<string[]>(["cadastros:escrever"]);
  const [ips, setIps] = useState("");
  const [validade, setValidade] = useState("365");
  const [dePara, setDePara] = useState("");

  const [url, setUrl] = useState("");
  const [eventos, setEventos] = useState<string[]>(["aluno.nivel_alterado"]);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/escola/rede/integracoes", { credentials: "include" });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErro(`${d.error ?? "Não foi possível carregar as integrações."} (código ${r.status})`);
      return;
    }
    setDados(await r.json());
  }, []);
  useEffect(() => { carregar().catch(() => setErro("Não foi possível carregar as integrações.")); }, [carregar]);

  async function chamar(caminho: string, opcoes: RequestInit, sucesso: string) {
    setOcupado(true); setErro(""); setOk("");
    try {
      const r = await fetch(caminho, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opcoes });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.error ?? "Não foi possível concluir."); return null; }
      setOk(sucesso);
      await carregar();
      return d;
    } catch {
      setErro("Sem conexão. Tente de novo.");
      return null;
    } finally {
      setOcupado(false);
    }
  }

  async function criarChave() {
    const d = await chamar("/api/escola/rede/integracoes", {
      method: "POST",
      body: JSON.stringify({
        tipo: "chave", nome, escopos, validadeDias: Number(validade) || 0,
        ips: ips.split(/[\s,;]+/).filter(Boolean), dePara: lerDePara(dePara),
      }),
    }, "Chave criada.");
    if (d?.chave) { setChaveNova(d.chave); setNome(""); setIps(""); setDePara(""); }
  }

  async function criarEndereco() {
    const d = await chamar("/api/escola/rede/integracoes", { method: "POST", body: JSON.stringify({ tipo: "endereco", url, eventos }) }, "Endereço cadastrado.");
    if (d?.segredo) { setSegredoNovo(d.segredo); setUrl(""); }
  }

  async function testar(id: string) {
    setOcupado(true); setErro(""); setOk("");
    try {
      const r = await fetch(`/api/escola/rede/integracoes/${id}/testar`, { method: "POST", credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (d.ok) setOk("O sistema externo recebeu o aviso de teste.");
      else setErro(d.motivo ?? d.error ?? "O sistema externo não respondeu ao aviso de teste.");
      await carregar();
    } finally {
      setOcupado(false);
    }
  }

  const alternar = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const base = typeof window !== "undefined" ? window.location.origin : "";

  if (!dados) return <div className="p-8 text-center text-[#5B5470]">{erro || "Carregando..."}</div>;
  const ativas = dados.chaves.filter((c) => !c.revokedAt);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Plug className="w-6 h-6 text-[#6D28D9]" />
        <h1 className="text-2xl font-bold text-[#1F1A2E]">Integrações</h1>
      </div>
      <p className="text-[#5B5470] text-sm mb-6">
        Ligue o sistema de gestão da rede ao SpeakFlow Escolas: ele envia escolas, servidores, alunos e turmas, e consulta os resultados do reforço.
        Cada sistema usa a sua própria chave, que pode ser revogada a qualquer momento.
      </p>

      {erro && <div className="bg-[#FEE2E2] border border-[#B91C1C]/20 rounded-lg p-3 text-[#B91C1C] text-sm mb-4">{erro}</div>}
      {ok && <div className="bg-[#DCFCE7] border border-[#166534]/20 rounded-lg p-3 text-[#166534] text-sm mb-4">{ok}</div>}
      {chaveNova && <Segredo titulo="Chave de acesso criada" valor={chaveNova} aviso="Copie agora e entregue ao responsável técnico do sistema externo. Ela não será mostrada de novo." />}
      {segredoNovo && <Segredo titulo="Segredo do endereço de avisos" valor={segredoNovo} aviso="O sistema externo usa este segredo para conferir a assinatura de cada aviso. Ele não será mostrado de novo." />}

      <div className="space-y-6">
        <section className={CARTAO}>
          <h2 className="font-semibold text-[#1F1A2E]">Chaves de acesso</h2>
          <p className="text-[#5B5470] text-sm mt-1 mb-4">Uma chave por sistema. Guardamos apenas uma impressão digital da chave, nunca a chave em si.</p>

          {ativas.length === 0 && <p className="text-sm text-[#5B5470] mb-4">Nenhuma chave ativa.</p>}
          <ul className="space-y-2 mb-5">
            {dados.chaves.map((c) => (
              <li key={c.id} className="rounded-lg border border-[#E9E5F5] px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex-1 min-w-[200px]">
                  <p className={`text-sm font-semibold ${c.revokedAt ? "text-[#5B5470] line-through" : "text-[#1F1A2E]"}`}>{c.name}</p>
                  <p className="text-xs text-[#5B5470]">
                    {c.prefix} · {c.scopes.map((s) => dados.escopos[s] ?? s).join("; ")}
                    {c.allowedIps?.length ? ` · ${c.allowedIps.length} IP(s) permitido(s)` : " · qualquer IP"}
                  </p>
                  <p className="text-xs text-[#5B5470]">
                    {c.revokedAt ? `Revogada em ${data(c.revokedAt)}` : `Último uso: ${data(c.lastUsedAt)}${c.expiresAt ? ` · vence em ${data(c.expiresAt)}` : ""}`}
                  </p>
                </div>
                {!c.revokedAt && (
                  <button
                    disabled={ocupado}
                    onClick={() => { if (window.confirm(`Revogar a chave "${c.name}"? O sistema que a usa para de funcionar na hora.`)) chamar(`/api/escola/rede/integracoes/${c.id}?tipo=chave`, { method: "DELETE" }, "Chave revogada."); }}
                    className="h-[40px] px-3 rounded-lg border border-[#B91C1C]/30 text-[#B91C1C] text-sm flex items-center gap-1.5"
                  >
                    <Trash2 size={15} />Revogar
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="border-t border-[#E9E5F5] pt-4 space-y-3">
            <p className="text-sm font-semibold text-[#1F1A2E]">Nova chave</p>
            <div>
              <label className="text-xs text-[#5B5470]" htmlFor="nome-chave">Nome do sistema</label>
              <input id="nome-chave" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sistema de matrícula da secretaria" className={CAMPO} />
            </div>
            <div>
              <p className="text-xs text-[#5B5470] mb-1">Permissões</p>
              {Object.entries(dados.escopos).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-[#1F1A2E] py-1">
                  <input type="checkbox" checked={escopos.includes(k)} onChange={() => setEscopos(alternar(escopos, k))} className="w-4 h-4 accent-[#6D28D9]" />{v}
                </label>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#5B5470]" htmlFor="ips-chave">Endereços IP permitidos (opcional)</label>
                <input id="ips-chave" value={ips} onChange={(e) => setIps(e.target.value)} placeholder="Ex.: 200.10.20.30, 200.10.21.0/24" className={CAMPO} />
              </div>
              <div>
                <label className="text-xs text-[#5B5470]" htmlFor="validade-chave">Validade</label>
                <select id="validade-chave" value={validade} onChange={(e) => setValidade(e.target.value)} className={CAMPO}>
                  <option value="90">90 dias</option>
                  <option value="365">1 ano</option>
                  <option value="0">Sem vencimento</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#5B5470]" htmlFor="depara-chave">De-para de campos (opcional): um por linha, no formato campo_do_sistema = campo_do_speakflow</label>
              <textarea id="depara-chave" value={dePara} onChange={(e) => setDePara(e.target.value)} rows={3} placeholder={"cod_estudante = matricula_aluno\nnm_estudante = nome_aluno"} className={`${CAMPO} h-auto py-2 font-mono`} />
            </div>
            <button onClick={criarChave} disabled={ocupado || nome.trim().length < 3 || !escopos.length} className={BOTAO}>Criar chave</button>
          </div>
        </section>

        <section className={CARTAO}>
          <h2 className="font-semibold text-[#1F1A2E]">Avisos automáticos</h2>
          <p className="text-[#5B5470] text-sm mt-1 mb-4">
            O SpeakFlow chama o endereço do sistema externo quando algo acontece. O aviso leva a matrícula e o código da habilidade, nunca o nome do aluno, e vai assinado.
          </p>
          <ul className="space-y-2 mb-5">
            {dados.enderecos.map((e) => (
              <li key={e.id} className="rounded-lg border border-[#E9E5F5] px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold text-[#1F1A2E] break-all">{e.url}</p>
                  <p className="text-xs text-[#5B5470]">{e.events.map((v) => dados.eventos[v] ?? v).join("; ")}</p>
                  <p className="text-xs text-[#5B5470]">
                    {e.isActive ? "Ativo" : "Desligado"} · última entrega: {data(e.lastDeliveryAt)}{e.lastStatus ? ` · ${e.lastStatus === "OK" ? "entregue" : e.lastStatus}` : ""}
                  </p>
                </div>
                <button disabled={ocupado} onClick={() => testar(e.id)} className="h-[40px] px-3 rounded-lg border border-[#DDD6EE] text-[#6D28D9] text-sm flex items-center gap-1.5"><Send size={15} />Testar</button>
                <button disabled={ocupado} onClick={() => chamar(`/api/escola/rede/integracoes/${e.id}?tipo=endereco`, { method: "PATCH", body: JSON.stringify({ ativo: !e.isActive }) }, e.isActive ? "Endereço desligado." : "Endereço ligado.")} className="h-[40px] px-3 rounded-lg border border-[#DDD6EE] text-[#1F1A2E] text-sm">{e.isActive ? "Desligar" : "Ligar"}</button>
                <button disabled={ocupado} onClick={() => { if (window.confirm("Remover este endereço?")) chamar(`/api/escola/rede/integracoes/${e.id}?tipo=endereco`, { method: "DELETE" }, "Endereço removido."); }} className="h-[40px] px-3 rounded-lg border border-[#B91C1C]/30 text-[#B91C1C] text-sm flex items-center gap-1.5"><Trash2 size={15} />Remover</button>
              </li>
            ))}
            {dados.enderecos.length === 0 && <li className="text-sm text-[#5B5470]">Nenhum endereço cadastrado.</li>}
          </ul>
          <div className="border-t border-[#E9E5F5] pt-4 space-y-3">
            <div>
              <label className="text-xs text-[#5B5470]" htmlFor="url-aviso">Endereço do sistema externo (precisa começar com https://)</label>
              <input id="url-aviso" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sistema.exemplo.gov.br/avisos/speakflow" className={CAMPO} />
            </div>
            {Object.entries(dados.eventos).filter(([k]) => k !== "integracao.teste").map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-[#1F1A2E]">
                <input type="checkbox" checked={eventos.includes(k)} onChange={() => setEventos(alternar(eventos, k))} className="w-4 h-4 accent-[#6D28D9]" />{v}
              </label>
            ))}
            <button onClick={criarEndereco} disabled={ocupado || !url.trim() || !eventos.length} className={BOTAO}>Cadastrar endereço</button>
          </div>
        </section>

        <section className={CARTAO}>
          <h2 className="font-semibold text-[#1F1A2E]">Histórico</h2>
          <p className="text-[#5B5470] text-sm mt-1 mb-3">As 50 chamadas mais recentes. O histórico guarda quantidades e motivos de recusa, sem o conteúdo enviado.</p>
          {dados.historico.length === 0 ? (
            <p className="text-sm text-[#5B5470]">Nenhuma chamada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#5B5470] border-b border-[#E9E5F5]">
                    <th className="py-2 pr-3 font-medium">Quando</th><th className="py-2 pr-3 font-medium">Sistema</th><th className="py-2 pr-3 font-medium">O quê</th>
                    <th className="py-2 pr-3 font-medium">Resultado</th><th className="py-2 pr-3 font-medium text-right">Itens</th><th className="py-2 pr-3 font-medium text-right">Novos</th>
                    <th className="py-2 pr-3 font-medium text-right">Atualizados</th><th className="py-2 font-medium text-right">Recusados</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.historico.map((h) => (
                    <tr key={h.id} className="border-b border-[#F3F0FB] align-top">
                      <td className="py-2 pr-3 whitespace-nowrap text-[#5B5470]">{data(h.createdAt)}</td>
                      <td className="py-2 pr-3">{dados.chaves.find((c) => c.id === h.keyId)?.name ?? "—"}</td>
                      <td className="py-2 pr-3">{h.direction === "IN" ? "Recebeu" : "Consultou"} {h.resource}
                        {h.errors?.length ? <span className="block text-xs text-[#B91C1C]">{h.errors.slice(0, 3).map((e) => `item ${e.item}: ${e.mensagem}`).join(" · ")}</span> : null}
                      </td>
                      <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[h.status]?.cor ?? ""}`}>{STATUS[h.status]?.texto ?? h.status}</span></td>
                      <td className="py-2 pr-3 text-right tabular-nums">{h.received}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{h.created}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{h.updated}</td>
                      <td className="py-2 text-right tabular-nums">{h.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={CARTAO}>
          <h2 className="font-semibold text-[#1F1A2E]">Para o responsável técnico do sistema externo</h2>
          <p className="text-[#5B5470] text-sm mt-1 mb-3">Toda chamada usa https e leva a chave no cabeçalho <code>Authorization: Bearer</code>. Limite de 120 chamadas por minuto e 500 itens por chamada.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["GET", "/api/escola/integracao/v1", "Testa a conexão e mostra as permissões da chave"],
                  ["POST", "/api/escola/integracao/v1/escolas", "nome_escola, codigo_inep"],
                  ["POST", "/api/escola/integracao/v1/servidores", "nome, email, papel (PROFESSOR, COORDENADOR, DIRETOR, GESTOR_REDE), codigo_inep_escola"],
                  ["POST", "/api/escola/integracao/v1/alunos", "nome_aluno, matricula_aluno, turma, codigo_inep, etapa, turno, ano_serie, data_nascimento"],
                  ["POST", "/api/escola/integracao/v1/atribuicoes", "turma, componente, email_professor, codigo_inep"],
                  ["GET", "/api/escola/integracao/v1/resultados/alunos", "Degrau por habilidade de cada aluno (pagina, porPagina, inep, matricula)"],
                  ["GET", "/api/escola/integracao/v1/resultados/escolas", "Resumo por escola, só números"],
                ].map(([m, c, d]) => (
                  <tr key={c} className="border-b border-[#F3F0FB] align-top">
                    <td className="py-2 pr-3 font-mono text-xs text-[#6D28D9]">{m}</td>
                    <td className="py-2 pr-3 font-mono text-xs break-all">{c}</td>
                    <td className="py-2 text-[#5B5470]">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[#5B5470] text-sm mt-4 mb-1">Exemplo de envio de alunos (JSON). Também aceita CSV com <code>Content-Type: text/csv</code>.</p>
          <pre className="bg-[#F8F7FC] border border-[#E9E5F5] rounded-lg p-3 text-xs overflow-x-auto text-[#1F1A2E]">{`curl -X POST ${base}/api/escola/integracao/v1/alunos \\
  -H "Authorization: Bearer SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{"itens":[{"nome_aluno":"Nome do aluno","matricula_aluno":"2026001","turma":"6º Ano B","codigo_inep":"29000000","ano_serie":"6"}]}'`}</pre>
          <p className="text-[#5B5470] text-sm mt-3">
            Reenviar o mesmo registro não duplica: a escola é reconhecida pelo código INEP, o aluno pela matrícula e o servidor pelo e-mail.
            Cada aviso automático traz o cabeçalho <code>X-SpeakFlow-Assinatura: t=instante,v1=assinatura</code>, em que a assinatura é o HMAC-SHA256 de <code>instante.corpo</code> com o segredo do endereço.
          </p>
        </section>
      </div>
    </div>
  );
}

"use client";
/**
 * Convite do assistente social ou psicólogo da equipe de apoio ao aluno.
 * A pessoa confere os próprios dados, lê o termo de sigilo e proteção de dados e escolhe:
 * aceitar e criar a senha, ou recusar e pedir a exclusão do cadastro.
 * O link é pessoal: a tela só recebe os dados ligados a este convite.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Check, UserX } from "lucide-react";
import { TERMO_ITENS, TERMO_VERSAO } from "@/lib/escola/apoio-profissional";

export interface ConviteDeApoio {
  name: string; email: string; networkName: string | null; mode: "create" | "login";
  apoio: { funcao: string; conselho: string; registro: string; uf: string; atende: string; verificacao: string };
}

const FUNCAO: Record<string, string> = { ASSISTENTE_SOCIAL: "Assistente social", PSICOLOGO: "Psicólogo(a)" };

function Marca({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="w-full text-left flex items-start gap-3 min-h-[44px]">
      <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${on ? "bg-[#6D28D9] border-[#6D28D9]" : "border-[#C4B5FD] bg-white"}`}>{on && <Check size={15} className="text-white" strokeWidth={3} />}</span>
      <span className="text-[14px] text-[#3B3550] leading-snug">{children}</span>
    </button>
  );
}

export default function ConviteDoProfissional({ token, convite, onTermos }: { token: string; convite: ConviteDeApoio; onTermos: () => void }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [dadosCertos, setDadosCertos] = useState(false);
  const [sigilo, setSigilo] = useState(false);
  const [termos, setTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [recusando, setRecusando] = useState(false);
  const [recusado, setRecusado] = useState(false);
  const a = convite.apoio;

  async function aceitar(e: React.FormEvent) {
    e.preventDefault();
    if (convite.mode === "create" && senha.length < 8) { setErro("A senha deve ter ao menos 8 caracteres."); return; }
    if (convite.mode === "create" && senha !== confirma) { setErro("As senhas não coincidem."); return; }
    setEnviando(true); setErro("");
    const r = await fetch(`/api/escola/convite/${token}/aceitar`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: senha, acceptTerms: termos, acceptSigilo: sigilo }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível concluir."); setEnviando(false); return; }
    router.push(d.redirect ?? "/escola/painel");
  }

  async function recusar() {
    setEnviando(true); setErro("");
    const r = await fetch(`/api/escola/convite/${token}/recusar`, { method: "POST" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnviando(false);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível registrar a recusa."); return; }
    setRecusado(true);
  }

  const cartao = "bg-white border border-[#E9E5F5] rounded-2xl p-5 sm:p-6";
  const campo = "w-full bg-white text-[#1F1A2E] rounded-xl px-3 py-3 text-base border-[1.5px] border-[#D8D3EC] focus:border-[#6D28D9] outline-none";
  if (recusado) {
    return (
      <div className="theme-escola min-h-screen bg-[#F8F7FC] flex items-center justify-center p-4">
        <div className={cartao + " max-w-md w-full text-center"}>
          <UserX className="mx-auto text-[#6D28D9] mb-3" size={40} />
          <h1 className="text-[#1F1A2E] font-extrabold text-xl">Cadastro recusado</h1>
          <p className="text-[#5B5470] text-[15px] leading-relaxed mt-2">O número do seu registro profissional já foi apagado e este link deixou de valer. A Secretaria de Educação foi avisada para excluir o restante do cadastro.</p>
          <p className="text-[#5B5470] text-[14px] mt-3">Você pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-escola min-h-screen bg-[#F8F7FC] px-4 py-6 sm:py-10">
      <div className="max-w-xl mx-auto space-y-4">
        <div className={cartao}>
          <h1 className="text-[#1F1A2E] font-extrabold text-[22px] leading-tight">Você foi cadastrado(a) na equipe de apoio ao aluno</h1>
          <p className="text-[#5B5470] text-[15px] leading-relaxed mt-2">
            A Secretaria de Educação{convite.networkName ? <> de <b className="text-[#1F1A2E]">{convite.networkName}</b></> : null} indicou você para ler os pedidos de ajuda que os alunos enviam pela plataforma de reforço escolar, acolher o aluno e encaminhar o caso à rede de proteção do município.
          </p>
        </div>

        <div className={cartao}>
          <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Confira os seus dados</h2>
          <p className="text-[13px] text-[#5B5470] mt-0.5">Foram informados pela Secretaria. Esta tela mostra só os seus.</p>
          <dl className="mt-3 divide-y divide-[#F1EEF9] text-[15px]">
            {[["Nome", convite.name], ["E-mail", convite.email], ["Função", FUNCAO[a.funcao] ?? a.funcao], ["Registro profissional", `${a.conselho} ${a.registro}/${a.uf}`], ["Atende", a.atende]].map(([k, v]) => (
              <div key={k} className="py-2 flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-[13px] font-bold text-[#5B5470] sm:w-44 shrink-0">{k}</dt>
                <dd className="text-[#1F1A2E] break-words min-w-0">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[13px] text-[#5B5470] mt-3">Se algum dado estiver errado, não aceite: peça a correção à Secretaria, que envia um convite novo.</p>
        </div>

        <div className={cartao}>
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[#1F1A2E]"><ShieldCheck size={18} className="text-[#6D28D9] shrink-0" />Termo de sigilo e proteção de dados</h2>
          <p className="text-[12px] text-[#8B84A0] mt-0.5">Versão {TERMO_VERSAO.split("-").reverse().join("/")}</p>
          <ol className="mt-3 space-y-3">
            {TERMO_ITENS.map((i, n) => (
              <li key={i.titulo} className="text-[14px] text-[#3B3550] leading-relaxed"><b className="text-[#1F1A2E]">{n + 1}. {i.titulo}.</b> {i.texto}</li>
            ))}
          </ol>
        </div>

        {!recusando ? (
          <form onSubmit={aceitar} className={cartao + " space-y-4"}>
            <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Aceitar e criar o acesso</h2>
            <Marca on={dadosCertos} onClick={() => setDadosCertos(!dadosCertos)}>Confirmo que os dados acima são meus e estão corretos.</Marca>
            <Marca on={sigilo} onClick={() => setSigilo(!sigilo)}>Li e aceito o termo de sigilo e proteção de dados.</Marca>
            <Marca on={termos} onClick={() => setTermos(!termos)}>Li e aceito os Termos de Uso da plataforma.</Marca>
            <button type="button" onClick={onTermos} className="text-[14px] font-semibold text-[#6D28D9] underline min-h-[36px]">Ler os Termos de Uso</button>
            {convite.mode === "create" ? (
              <>
                <div>
                  <label htmlFor="senha" className="text-[#5B5470] text-sm font-bold block mb-1">Crie a sua senha (mínimo de 8 caracteres)</label>
                  <input id="senha" type="password" minLength={8} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} required />
                </div>
                <div>
                  <label htmlFor="confirma" className="text-[#5B5470] text-sm font-bold block mb-1">Repita a senha</label>
                  <input id="confirma" type="password" minLength={8} autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} className={campo} required />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="senha" className="text-[#5B5470] text-sm font-bold block mb-1">Você já tem conta. Digite a sua senha atual</label>
                <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} required />
              </div>
            )}
            {erro && <p role="alert" className="text-[#B91C1C] text-sm font-semibold">{erro}</p>}
            <button type="submit" disabled={enviando || !dadosCertos || !sigilo || !termos} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-bold rounded-xl min-h-[52px] text-base">
              {enviando ? "Concluindo..." : "Aceitar e entrar"}
            </button>
            <button type="button" onClick={() => { setRecusando(true); setErro(""); }} className="w-full min-h-[44px] text-[14px] font-semibold text-[#5B5470] underline">Não reconheço este cadastro ou não quero participar</button>
          </form>
        ) : (
          <div className={cartao + " space-y-3"}>
            <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Recusar e pedir a exclusão do meu cadastro</h2>
            <p className="text-[14px] text-[#3B3550] leading-relaxed">Ao confirmar, o número do seu registro profissional é apagado na hora, este link deixa de valer e a Secretaria de Educação é avisada para excluir o restante do cadastro. Você não terá acesso à plataforma.</p>
            {erro && <p role="alert" className="text-[#B91C1C] text-sm font-semibold">{erro}</p>}
            <button onClick={recusar} disabled={enviando} className="w-full min-h-[52px] rounded-xl bg-[#B91C1C] text-white font-bold disabled:opacity-50">{enviando ? "Registrando..." : "Confirmar a recusa"}</button>
            <button onClick={() => setRecusando(false)} className="w-full min-h-[44px] text-[14px] font-semibold text-[#5B5470]">Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
}

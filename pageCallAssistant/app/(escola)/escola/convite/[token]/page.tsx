"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface InviteInfo {
  id: string; name: string; email: string; role: string;
  networkName: string | null; expiresAt: string; mode: "create" | "login";
}

const ROLE_LABEL: Record<string, string> = {
  NETWORK_ADMIN: "Gestor(a) de Rede",
  COORDINATOR: "Coordenador(a) Pedagógico(a)",
  SCHOOL_ADMIN: "Diretor(a) Escolar",
  TEACHER: "Professor(a)",
  PLATFORM_ADMIN: "Administrador(a) da Plataforma",
};

const TERMS_HTML = `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#374151">
<p style="margin:0 0 12px"><strong>Versão: 23/10/2026</strong></p>
<p style="margin:0 0 12px">Estes Termos de Uso regulam o acesso e o uso da plataforma <strong>SpeakFlow Escolas</strong> pelos servidores e colaboradores das redes de ensino que a contrataram. Ao marcar a caixa "Li e aceito os Termos de Uso" e concluir o primeiro acesso a partir do convite recebido, você declara que leu, compreendeu e concorda com estes Termos.</p>

<h3 style="margin:16px 0 6px;font-size:13px">1. QUEM SÃO AS PARTES E COMO A PLATAFORMA FUNCIONA</h3>
<p style="margin:0 0 8px">1.1 <strong>CODEVELOP SOLUTIONS LTDA</strong>, inscrita no CNPJ sob o nº 51.412.510/0001-07, com sede na Alameda Salvador, 1057, Edifício Torre América, sala 1802, Caminho das Árvores, Salvador/BA, CEP 41820-790, é a desenvolvedora e fornecedora da plataforma SpeakFlow Escolas ("Codevelop").</p>
<p style="margin:0 0 8px">1.2 <strong>Rede de ensino</strong> é o Município ou ente público que contratou a plataforma, por meio da sua Secretaria de Educação ("Rede"). A Rede define quem tem acesso, com quais perfis e em quais escolas.</p>
<p style="margin:0 0 8px">1.3 <strong>Usuário</strong> é você: a pessoa que recebeu um convite da Rede ou da Codevelop e criou sua senha para atuar como gestor da rede, coordenador pedagógico, diretor escolar ou professor.</p>
<p style="margin:0 0 8px">1.4 O acesso existe exclusivamente em razão do seu vínculo com a Rede. Encerrado o vínculo, ou por decisão da Rede, o acesso é desativado, sem prejuízo dos registros já realizados.</p>

<h3 style="margin:16px 0 6px;font-size:13px">2. CADASTRO, SENHA E RESPONSABILIDADE PELA CONTA</h3>
<p style="margin:0 0 8px">2.1 A conta é pessoal e intransferível. Você é responsável por manter a senha em sigilo e por todas as ações realizadas com suas credenciais.</p>
<p style="margin:0 0 8px">2.2 É proibido compartilhar a senha, usar a conta de outra pessoa ou permitir que terceiros, inclusive alunos, utilizem sua conta.</p>
<p style="margin:0 0 8px">2.3 Você deve informar imediatamente a Secretaria de Educação e o suporte da plataforma se suspeitar de uso indevido da sua conta.</p>
<p style="margin:0 0 8px">2.4 Os dados do seu cadastro (nome, e-mail, matrícula funcional, escola e perfil) são informados pela Rede. Se estiverem incorretos, solicite a correção à Secretaria.</p>

<h3 style="margin:16px 0 6px;font-size:13px">3. FINALIDADE E USO PERMITIDO</h3>
<p style="margin:0 0 8px">3.1 A plataforma deve ser usada apenas para fins pedagógicos e de gestão escolar da Rede, dentro das atribuições do seu perfil: planejamento, atividades, avaliação, registro de notas, acompanhamento da aprendizagem e gestão de turmas.</p>
<p style="margin:0 0 8px">3.2 O uso de dispositivos pelos alunos em sala de aula deve observar a Lei nº 15.100/2025, com finalidade pedagógica e orientação do professor.</p>
<p style="margin:0 0 4px">3.3 É proibido:</p>
<ul style="margin:0 0 8px;padding-left:20px">
  <li>acessar ou tentar acessar dados de turmas, escolas ou redes fora do seu perfil;</li>
  <li>copiar, exportar, divulgar ou usar dados de alunos fora da finalidade escolar;</li>
  <li>inserir conteúdo ilícito, discriminatório, violento, sexual ou inadequado para crianças e adolescentes;</li>
  <li>inserir dados pessoais desnecessários ou sensíveis de alunos em campos livres;</li>
  <li>tentar contornar mecanismos de segurança, de auditoria ou de integridade das notas;</li>
  <li>usar robôs, extrair dados em massa ou fazer engenharia reversa da plataforma.</li>
</ul>

<h3 style="margin:16px 0 6px;font-size:13px">4. DADOS DE ALUNOS E SIGILO</h3>
<p style="margin:0 0 8px">4.1 Os dados de alunos pertencem à Rede, que é a controladora nos termos da Lei nº 13.709/2018 (LGPD). A Codevelop é a operadora e trata os dados conforme o contrato com a Rede.</p>
<p style="margin:0 0 8px">4.2 Ao acessar dados de alunos, você atua em nome da Rede e se compromete a observar a LGPD, o ECA e o ECA Digital (Lei nº 15.211/2025), sempre no melhor interesse da criança e do adolescente.</p>
<p style="margin:0 0 8px">4.3 Você deve manter sigilo sobre os dados de alunos, famílias e colegas a que tiver acesso, inclusive após o término do seu vínculo.</p>
<p style="margin:0 0 8px">4.4 Cartões de acesso e PINs dos alunos devem ser guardados na escola e entregues apenas aos próprios alunos.</p>

<h3 style="margin:16px 0 6px;font-size:13px">5. USO DE INTELIGÊNCIA ARTIFICIAL</h3>
<p style="margin:0 0 8px">5.1 A plataforma usa inteligência artificial para sugerir correções, comentários, notas e atividades. As sugestões da IA não são decisões: a nota e a avaliação final são sempre do professor.</p>
<p style="margin:0 0 8px">5.2 Você é responsável pelo conteúdo que publica para os alunos, inclusive quando partir de uma sugestão da IA.</p>
<p style="margin:0 0 8px">5.3 A plataforma não envia nome, matrícula ou outros identificadores dos alunos aos provedores de inteligência artificial.</p>

<h3 style="margin:16px 0 6px;font-size:13px">6. NOTAS, ASSINATURA E REGISTROS DE AUDITORIA</h3>
<p style="margin:0 0 8px">6.1 Ao publicar notas ou fechar um período, a plataforma registra a sua autoria. Essa confirmação tem o valor de manifestação da sua vontade sobre aquele lançamento.</p>
<p style="margin:0 0 8px">6.2 Notas publicadas e atas de fechamento são registradas de forma imutável. Correções somente ocorrem por retificação justificada e aprovada por outro servidor autorizado.</p>
<p style="margin:0 0 8px">6.3 Ações relevantes ficam registradas em trilha de auditoria, que pode ser consultada pela Rede e por órgãos de controle.</p>
<p style="margin:0 0 8px">6.4 Você declara estar ciente de que lançar informação falsa ou alterar indevidamente registros escolares pode configurar infração disciplinar e ilícito civil, administrativo ou penal.</p>

<h3 style="margin:16px 0 6px;font-size:13px">7. CONTEÚDO PRODUZIDO PELO USUÁRIO</h3>
<p style="margin:0 0 8px">7.1 Planos de ensino, atividades, rubricas e comentários que você inserir permanecem disponíveis à Rede para uso pedagógico, inclusive após o fim do seu vínculo.</p>
<p style="margin:0 0 8px">7.2 Você autoriza a Codevelop a armazenar, processar e exibir esse conteúdo exclusivamente para operar a plataforma para a Rede.</p>

<h3 style="margin:16px 0 6px;font-size:13px">8. SEUS DADOS PESSOAIS COMO USUÁRIO</h3>
<p style="margin:0 0 8px">8.1 Para operar a plataforma, são tratados: nome, e-mail, matrícula funcional, escola, perfil, registros de acesso e as ações registradas na auditoria.</p>
<p style="margin:0 0 8px">8.2 Esses dados são tratados para execução das políticas públicas de educação da Rede (LGPD, arts. 7º, II e III, e 23), e não dependem do seu consentimento.</p>
<p style="margin:0 0 8px">8.3 Você pode exercer os direitos previstos na LGPD pelo e-mail <strong>luiz.melo@cdsolutions.com.br</strong>. Mais informações no Aviso de Privacidade em <strong>www.speakflow.ia.br/escola/privacidade</strong>.</p>

<h3 style="margin:16px 0 6px;font-size:13px">9. DISPONIBILIDADE, SUPORTE E SUSPENSÃO</h3>
<p style="margin:0 0 8px">9.1 A Codevelop mantém a plataforma disponível conforme os níveis de serviço contratados pela Rede, podendo realizar manutenções programadas com aviso prévio.</p>
<p style="margin:0 0 8px">9.2 O acesso pode ser suspenso em caso de violação destes Termos, risco à segurança ou encerramento do vínculo, com comunicação à Rede.</p>

<h3 style="margin:16px 0 6px;font-size:13px">10. RESPONSABILIDADES</h3>
<p style="margin:0 0 8px">10.1 A Codevelop responde pela operação da plataforma nos termos do contrato com a Rede e da legislação aplicável.</p>
<p style="margin:0 0 8px">10.2 O Usuário responde pelo uso que fizer da conta e pelo conteúdo que inserir ou publicar.</p>

<h3 style="margin:16px 0 6px;font-size:13px">11. ALTERAÇÕES DOS TERMOS</h3>
<p style="margin:0 0 8px">11.1 Estes Termos podem ser atualizados. Alterações relevantes serão comunicadas na plataforma e exigirão novo aceite. A versão vigente fica disponível em <strong>www.speakflow.ia.br/escola/termos</strong>.</p>

<h3 style="margin:16px 0 6px;font-size:13px">12. LEGISLAÇÃO E FORO</h3>
<p style="margin:0 0 8px">12.1 Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de Salvador/BA para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.</p>
</div>`;

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Termos de Uso — SpeakFlow Escolas</h2>
            <p className="text-xs text-gray-500 mt-0.5">Codevelop Solutions LTDA · CNPJ 51.412.510/0001-07</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-light">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4" dangerouslySetInnerHTML={{ __html: TERMS_HTML }} />
        <div className="px-6 py-4 border-t border-gray-200 shrink-0">
          <button onClick={onClose} className="w-full bg-purple-700 hover:bg-purple-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
            Li e entendi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConvitePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    fetch(`/api/escola/convite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInvite(data);
        setLoading(false);
      });
  }, [token]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (invite?.mode === "create" && password !== confirm) { setError("As senhas não coincidem"); return; }
    if (invite?.mode === "create" && password.length < 8) { setError("Senha deve ter ao menos 8 caracteres"); return; }
    setSubmitting(true); setError("");
    const r = await fetch(`/api/escola/convite/${token}/aceitar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, acceptTerms }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? "Erro ao aceitar convite"); setSubmitting(false); return; }
    router.push(data.redirect ?? "/escola/painel");
  }

  if (loading) return <div className="theme-escola min-h-screen bg-[#F8F7FC] flex items-center justify-center text-[#5B5470]">Carregando...</div>;

  if (error && !invite) return (
    <div className="theme-escola min-h-screen bg-[#F8F7FC] flex items-center justify-center p-4">
      <div className="bg-white border border-[#E9E5F5] rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h1 className="text-[#1F1A2E] font-bold text-lg mb-2">Convite inválido</h1>
        <p className="text-[#5B5470] text-sm">{error}</p>
      </div>
    </div>
  );

  const roleLabel = ROLE_LABEL[invite?.role ?? ""] ?? invite?.role;

  return (
    <>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      <div className="theme-escola min-h-screen bg-[#F8F7FC] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-8 max-w-md w-full shadow-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#EDE9FE] flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <h1 className="text-[#1F1A2E] font-bold text-xl">Você foi convidado(a)!</h1>
            <p className="text-[#5B5470] text-sm mt-1">
              Função: <span className="text-[#6D28D9] font-medium">{roleLabel}</span>
              {invite?.networkName && (
                <> · <span className="text-[#1F1A2E]">{invite.networkName}</span></>
              )}
            </p>
          </div>

          <div className="bg-[#F4F2FB] rounded-lg px-4 py-3 mb-6">
            <div className="text-[#8E87A8] text-xs mb-0.5">Convidado(a)</div>
            <div className="text-[#1F1A2E] font-medium">{invite?.name}</div>
            <div className="text-[#5B5470] text-sm">{invite?.email}</div>
          </div>

          <form onSubmit={accept} className="space-y-4">
            {invite?.mode === "create" && (
              <>
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Criar senha (mín. 8 caracteres) *</label>
                  <input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white text-[#1F1A2E] rounded-lg px-3 py-3 text-base border border-[#D8D3EC] focus:border-[#6D28D9] outline-none" required />
                </div>
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Confirmar senha *</label>
                  <input type="password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)}
                    className="w-full bg-white text-[#1F1A2E] rounded-lg px-3 py-3 text-base border border-[#D8D3EC] focus:border-[#6D28D9] outline-none" required />
                </div>
              </>
            )}
            {invite?.mode === "login" && (
              <>
                <p className="text-[#5B5470] text-sm bg-[#F4F2FB] rounded-lg p-3">
                  Você já tem uma conta SpeakFlow Escolas. Confirme sua senha atual para aceitar o convite e adicionar o novo vínculo.
                </p>
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Sua senha atual *</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white text-[#1F1A2E] rounded-lg px-3 py-3 text-base border border-[#D8D3EC] focus:border-[#6D28D9] outline-none" required />
                </div>
              </>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
                className="w-5 h-5 accent-[#6D28D9] mt-0.5 shrink-0" required />
              <span className="text-[#5B5470] text-sm">
                Li e aceito os{" "}
                <button type="button" onClick={() => setShowTerms(true)} className="text-[#6D28D9] underline hover:text-[#5B21B6]">
                  Termos de Uso
                </button>
                {" "}e a{" "}
                <a href="/escola/privacidade" target="_blank" className="text-[#6D28D9] underline hover:text-[#5B21B6]">
                  política de privacidade
                </a>
                {" "}do SpeakFlow Escolas
              </span>
            </label>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={submitting || !acceptTerms}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold py-3 rounded-xl min-h-[44px] text-base transition-colors">
              {submitting ? "Processando..." : "Aceitar convite"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

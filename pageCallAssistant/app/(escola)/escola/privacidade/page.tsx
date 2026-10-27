export const metadata = { title: "Aviso de Privacidade — SpeakFlow Escolas" };

export default function PrivacidadePage() {
  return (
    <div className="theme-escola min-h-screen bg-[#F8F7FC] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <span className="font-extrabold text-[18px] text-[#1F1A2E]">SpeakFlow</span>
          <span className="font-extrabold text-[18px] text-[#BE185D]">Escolas</span>
        </div>
        <h1 className="text-[28px] font-extrabold text-[#1F1A2E] mb-2">Aviso de Privacidade</h1>
        <p className="text-[13px] text-[#5B5470] mb-8">Conforme LGPD (Lei 13.709/2018) e ECA Digital (Lei 15.211/2025).</p>

        <div className="space-y-5 text-[14px] text-[#3F3A4F] leading-relaxed">
          <p><b>Controlador e operador.</b> A Secretaria/rede de ensino é a controladora dos dados; a Codevelop Solutions é a operadora, tratando os dados sob instrução da instituição.</p>
          <p><b>Dados tratados.</b> Equipe e responsáveis: nome, e-mail e/ou celular. Aluno: nome, matrícula, data de nascimento e as respostas das atividades (texto e áudio). Dados de uso e diagnóstico do serviço. <b>Não</b> coletamos CPF do aluno, foto, localização, nem identificadores do aparelho.</p>
          <p><b>Finalidade.</b> Oferecer reforço escolar personalizado, retorno por IA e acompanhamento da escola e da família. Base legal: execução de políticas públicas de educação e legítimo interesse pedagógico (art. 14 da LGPD, com o melhor interesse da criança).</p>
          <p><b>Inteligência artificial.</b> As respostas podem ser enviadas à OpenAI para gerar o retorno, <b>sem</b> nome ou matrícula do aluno. Há moderação de entrada e saída.</p>
          <p><b>Compartilhamento.</b> Não vendemos dados, não usamos para publicidade e não há rastreamento entre apps/sites.</p>
          <p><b>Segurança.</b> Dados criptografados em trânsito; isolamento total por rede; acesso da família registrado e revogável pela escola.</p>
          <p><b>Direitos e exclusão.</b> Titulares podem solicitar acesso, correção e exclusão. Veja <a href="/escola/excluir-conta" className="underline">Excluir conta</a>.</p>
          <p><b>Encarregado (DPO).</b> dpo@codevelop.com.br</p>
        </div>

        <p className="text-[12px] text-[#5B5470] mt-8">
          Veja também os <a href="/escola/termos" className="underline">Termos de Uso</a>.
        </p>
      </div>
    </div>
  );
}

export const metadata = { title: "Termos de Uso — SpeakFlow Escolas" };

export default function TermosPage() {
  return (
    <div className="theme-escola min-h-screen bg-[#F8F7FC] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <span className="font-extrabold text-[18px] text-[#1F1A2E]">SpeakFlow</span>
          <span className="font-extrabold text-[18px] text-[#BE185D]">Escolas</span>
        </div>
        <h1 className="text-[28px] font-extrabold text-[#1F1A2E] mb-2">Termos de Uso</h1>
        <p className="text-[13px] text-[#5B5470] mb-8">Última atualização: 2026</p>

        <div className="space-y-5 text-[14px] text-[#3F3A4F] leading-relaxed">
          <p><b>1. O serviço.</b> O SpeakFlow Escolas é uma plataforma de reforço escolar em casa com inteligência artificial, contratada por redes de ensino e escolas (modelo B2B). Não há compra nem assinatura dentro do aplicativo; o acesso é fornecido pela instituição de ensino.</p>
          <p><b>2. Perfis.</b> O acesso é criado pela escola para equipe (gestor, coordenação, direção, professor), aluno (cartão/PIN) e responsável (família). Cada perfil vê apenas o que lhe compete.</p>
          <p><b>3. Uso adequado.</b> O serviço destina-se a fins pedagógicos. É proibido usar a plataforma para fins ilícitos, ofensivos ou que violem direitos de terceiros.</p>
          <p><b>4. Inteligência artificial.</b> As respostas dos alunos (texto ou áudio) podem ser enviadas a um serviço de IA (OpenAI) para gerar o retorno pedagógico. Nome e matrícula do aluno não são enviados. Há moderação de entrada e saída.</p>
          <p><b>5. Propriedade.</b> A Secretaria/escola é a controladora dos dados dos alunos; a Codevelop Solutions é a operadora. O conteúdo da plataforma pertence à Codevelop.</p>
          <p><b>6. Conta e exclusão.</b> A exclusão de conta segue as regras descritas em <a href="/escola/excluir-conta" className="underline">Excluir conta</a>.</p>
          <p><b>7. Contato.</b> suporte@codevelop.com.br</p>
        </div>

        <p className="text-[12px] text-[#5B5470] mt-8">
          Veja também o <a href="/escola/privacidade" className="underline">Aviso de Privacidade</a>.
        </p>
      </div>
    </div>
  );
}

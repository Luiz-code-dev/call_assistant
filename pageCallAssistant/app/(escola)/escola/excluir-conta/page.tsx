import { HeartHandshake, Trash2, Mail, School } from "lucide-react";

export const metadata = { title: "Excluir conta — SpeakFlow Escolas" };

export default function ExcluirContaPage() {
  return (
    <div className="theme-escola min-h-screen bg-[#F8F7FC] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <span className="font-extrabold text-[18px] text-[#1F1A2E]">SpeakFlow</span>
          <span className="font-extrabold text-[18px] text-[#BE185D]">Escolas</span>
        </div>
        <h1 className="text-[28px] font-extrabold text-[#1F1A2E] mb-2">Excluir sua conta</h1>
        <p className="text-[15px] text-[#5B5470] mb-8">
          Como a conta do aluno pertence à escola, a exclusão funciona de forma diferente para cada perfil.
        </p>

        <div className="space-y-4">
          <section className="bg-white border border-[#E9E5F5] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2"><HeartHandshake size={18} className="text-[#6D28D9]" /><h2 className="text-[16px] font-bold text-[#1F1A2E]">Responsável (pai, mãe, familiar)</h2></div>
            <p className="text-[14px] text-[#5B5470]">No app, em <b>Configurações → Excluir minha conta</b>. Isso apaga a sua conta de família e os seus vínculos com os alunos. O aluno <b>não</b> é apagado, porque o cadastro dele é da escola.</p>
          </section>

          <section className="bg-white border border-[#E9E5F5] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2"><School size={18} className="text-[#6D28D9]" /><h2 className="text-[16px] font-bold text-[#1F1A2E]">Professor e equipe escolar</h2></div>
            <p className="text-[14px] text-[#5B5470]">A conta é da instituição. Em <b>Configurações → Solicitar exclusão</b>, o pedido é enviado à Secretaria e à Codevelop, com resposta em até <b>15 dias</b>.</p>
          </section>

          <section className="bg-white border border-[#E9E5F5] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2"><Trash2 size={18} className="text-[#6D28D9]" /><h2 className="text-[16px] font-bold text-[#1F1A2E]">Aluno</h2></div>
            <p className="text-[14px] text-[#5B5470]">A exclusão do aluno é solicitada pelo <b>responsável</b> ou pela <b>escola</b>, pois o cadastro é mantido pela instituição de ensino.</p>
          </section>

          <section className="bg-[#EDE9FE] border border-[#DDD6EE] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2"><Mail size={18} className="text-[#6D28D9]" /><h2 className="text-[16px] font-bold text-[#1F1A2E]">Precisa de ajuda?</h2></div>
            <p className="text-[14px] text-[#4C1D95]">Escreva para <a href="mailto:suporte@codevelop.com.br" className="underline font-medium">suporte@codevelop.com.br</a> com o nome da rede/escola. Respondemos em até 15 dias.</p>
          </section>
        </div>

        <p className="text-[12px] text-[#5B5470] mt-8">
          Veja também o <a href="/escola/privacidade" className="underline">Aviso de Privacidade</a> e os <a href="/escola/termos" className="underline">Termos de Uso</a>.
        </p>
      </div>
    </div>
  );
}

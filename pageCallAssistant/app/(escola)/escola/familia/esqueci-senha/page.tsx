import { HeartHandshake, KeyRound } from "lucide-react";

export const metadata = { title: "Esqueci minha senha — Área da Família" };

export default function EsqueciSenha() {
  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><HeartHandshake size={28} className="text-[#6D28D9]" /></div>
        <h1 className="text-[#1F1A2E] text-2xl font-bold mb-1">Esqueci minha senha</h1>
        <p className="text-[#5B5470] text-sm mb-6">Você pode criar uma nova senha com o código do cartão do seu filho.</p>

        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 text-left space-y-3">
          <div className="flex items-start gap-3">
            <KeyRound size={18} className="text-[#6D28D9] mt-0.5 shrink-0" />
            <p className="text-[14px] text-[#1F1A2E]">Peça à escola um <b>novo código de família</b> do cartão do aluno e use o <a href="/escola/familia/primeiro-acesso" className="text-[#6D28D9] font-medium">Primeiro acesso</a> para definir uma nova senha.</p>
          </div>
          <p className="text-[12px] text-[#5B5470]">Com o código do cartão + a data de nascimento do aluno, você cria a senha de novo — os seus filhos continuam vinculados.</p>
        </div>

        <a href="/escola/familia/entrar" className="inline-block mt-6 text-[13px] text-[#6D28D9]">Voltar para entrar</a>
      </div>
    </div>
  );
}

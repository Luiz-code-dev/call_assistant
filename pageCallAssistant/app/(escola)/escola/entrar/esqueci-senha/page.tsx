import { KeyRound, MessageSquare, ShieldCheck } from "lucide-react";

export const metadata = { title: "Esqueci minha senha — Equipe escolar" };

export default function EquipeEsqueciSenha() {
  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#6D28D9] flex items-center justify-center"><MessageSquare size={18} color="#FFFFFF" /></div>
          <span className="text-[#1F1A2E] text-xl font-extrabold">SpeakFlow <span className="text-[#6D28D9]">Escolas</span></span>
        </div>

        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><KeyRound size={26} className="text-[#6D28D9]" /></div>
          <h1 className="text-[#1F1A2E] text-2xl font-bold mb-1">Recuperar acesso da equipe</h1>
          <p className="text-[#5B5470] text-sm mb-5">As contas da equipe escolar (professor, coordenação, direção) são geridas pela instituição.</p>

          <div className="text-left space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-[#6D28D9] mt-0.5 shrink-0" />
              <p className="text-[14px] text-[#1F1A2E]">Peça à sua <b>Direção</b> ou à <b>Secretaria de Educação</b> para reenviar o convite de acesso. Pelo convite você cria uma nova senha.</p>
            </div>
            <div className="flex items-start gap-3">
              <KeyRound size={18} className="text-[#6D28D9] mt-0.5 shrink-0" />
              <p className="text-[14px] text-[#1F1A2E]"><b>Primeiro acesso?</b> Abra o convite que chegou no seu e-mail e defina a senha.</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/escola/entrar" className="text-[13px] text-[#6D28D9] font-medium">Voltar para entrar</a>
        </div>
      </div>
    </div>
  );
}

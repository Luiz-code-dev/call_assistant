import Link from "next/link";
import { Shield, Mic2, Lock, Eye, Trash2, Mail } from "lucide-react";

export const metadata = { title: "Privacidade & LGPD — SpeakFlow" };

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="flex items-center gap-2.5 mb-8">
            <img src="/icon.png" alt="SpeakFlow" className="h-8 w-8 rounded-xl" />
            <span className="text-xl font-medium text-zinc-400 tracking-tight">SpeakFlow</span>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15">
              <Shield className="h-5 w-5 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Privacidade & LGPD</h1>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Última atualização: maio de 2026 &nbsp;·&nbsp; SpeakFlow — www.speakflow.ia.br
          </p>
        </div>

        <div className="space-y-10 text-sm text-zinc-400 leading-relaxed">

          {/* Áudio */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mic2 className="h-5 w-5 text-violet-400 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Processamento de áudio</h2>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 mb-4">
              <p className="font-medium text-zinc-200">
                O SpeakFlow <strong className="text-white">não armazena seu áudio</strong>.
                Os dados de voz são enviados à API OpenAI Whisper exclusivamente para transcrição em tempo real e
                descartados imediatamente após o processamento.
              </p>
            </div>
            <ul className="space-y-2">
              <li>• O microfone é ativado <strong className="text-zinc-300">somente</strong> quando você inicia uma sessão no SpeakFlow Live.</li>
              <li>• O áudio nunca é gravado ou enviado para os servidores do SpeakFlow — apenas para a API OpenAI, criptografado via HTTPS.</li>
              <li>• A transcrição gerada é armazenada temporariamente em memória para gerar sugestões contextuais e apagada ao encerrar a sessão.</li>
              <li>• Você pode encerrar qualquer sessão a qualquer momento pelo botão &ldquo;Encerrar sessão&rdquo; no Live.</li>
            </ul>
          </section>

          {/* Dados coletados */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-violet-400 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Dados que coletamos</h2>
            </div>
            <ul className="space-y-2">
              <li>• <strong className="text-zinc-300">Conta:</strong> nome, e-mail e senha (hash bcrypt). Nunca armazenamos senhas em texto claro.</li>
              <li>• <strong className="text-zinc-300">Transcrições:</strong> armazenadas temporariamente em memória durante a sessão, não persistidas em banco.</li>
              <li>• <strong className="text-zinc-300">Uso da plataforma:</strong> créditos consumidos, ferramentas utilizadas, score de desafios — para fins de cobrança e progresso.</li>
              <li>• <strong className="text-zinc-300">Chat e feed:</strong> mensagens e posts são armazenados de forma criptografada e associados à sua conta.</li>
              <li>• <strong className="text-zinc-300">Cookies:</strong> utilizados apenas para autenticação de sessão (JWT). Nenhum cookie de rastreamento de terceiros.</li>
            </ul>
          </section>

          {/* Retenção */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="h-5 w-5 text-violet-400 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Retenção e exclusão de dados</h2>
            </div>
            <ul className="space-y-2">
              <li>• Seus dados são retidos enquanto sua conta estiver ativa.</li>
              <li>• Ao solicitar exclusão da conta, todos os dados pessoais são removidos permanentemente em até 30 dias.</li>
              <li>• Você pode solicitar a exclusão enviando um e-mail para <a href="mailto:privacidade@speakflow.ia.br" className="text-violet-400 hover:underline">privacidade@speakflow.ia.br</a>.</li>
              <li>• Você também pode solicitar pelo <Link href="/support" className="text-violet-400 hover:underline">formulário de suporte</Link>.</li>
            </ul>
          </section>

          {/* Compartilhamento */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-violet-400 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Compartilhamento de dados</h2>
            </div>
            <ul className="space-y-2">
              <li>• <strong className="text-zinc-300">Não vendemos</strong> dados pessoais para terceiros.</li>
              <li>• Compartilhamos apenas com provedores essenciais: OpenAI (transcrição e IA), Stripe (pagamentos) e Railway (infraestrutura). Todos sob acordos de privacidade.</li>
              <li>• Dados de pagamento são processados exclusivamente pelo Stripe — o SpeakFlow não armazena dados de cartão.</li>
            </ul>
          </section>

          {/* LGPD */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-violet-400 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Seus direitos (LGPD — Lei 13.709/2018)</h2>
            </div>
            <p className="mb-3">Como titular de dados, você tem direito a:</p>
            <ul className="space-y-2">
              <li>• Confirmar a existência de tratamento de dados pessoais seus;</li>
              <li>• Acessar seus dados;</li>
              <li>• Corrigir dados incompletos ou desatualizados;</li>
              <li>• Solicitar anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>• Solicitar portabilidade dos dados;</li>
              <li>• Revogar o consentimento a qualquer momento.</li>
            </ul>
          </section>

          {/* Contato */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-violet-400 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Contato & Encarregado de Dados (DPO)</h2>
            </div>
            <p>Para exercer seus direitos ou tirar dúvidas sobre privacidade:</p>
            <p className="mt-2">
              <a href="mailto:privacidade@speakflow.ia.br" className="text-violet-400 hover:underline">
                privacidade@speakflow.ia.br
              </a>
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>© 2026 SpeakFlow — www.speakflow.ia.br</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Início</Link>
            <Link href="/support" className="hover:text-zinc-300 transition-colors">Suporte</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

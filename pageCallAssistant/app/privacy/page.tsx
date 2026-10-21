import Link from "next/link";
import { Mic2 } from "lucide-react";

export const metadata = { title: "Política de Privacidade" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-10 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
            <Mic2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold">SpeakFlow</span>
        </Link>

        <h1 className="mb-2 text-3xl font-bold">Política de Privacidade</h1>
        <p className="mb-8 text-sm text-muted-foreground">Última atualização: abril de 2025</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Dados coletados</h2>
            <p>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome e e-mail para criação de conta</li>
              <li>Dados de pagamento processados diretamente pelo Stripe (não armazenamos dados de cartão)</li>
              <li>Histórico de uso de créditos</li>
              <li>Áudio processado temporariamente via API OpenAI para transcrição (não armazenado)</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Uso dos dados</h2>
            <p>Seus dados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Autenticação e gerenciamento da sua conta</li>
              <li>Processamento de pagamentos e controle de créditos</li>
              <li>Envio de e-mails transacionais (confirmação de conta, recibos)</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Compartilhamento</h2>
            <p>Não vendemos nem compartilhamos seus dados pessoais com terceiros, exceto com provedores de serviço essenciais (Stripe para pagamentos, OpenAI para processamento de áudio, Resend para e-mails), que possuem suas próprias políticas de privacidade.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Segurança</h2>
            <p>Utilizamos criptografia para proteger suas senhas (bcrypt) e comunicações (HTTPS). Tokens de sessão são armazenados em cookies httpOnly.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Seus direitos (LGPD)</h2>
            <p>Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a acessar, corrigir ou excluir seus dados. Para exercer esses direitos, entre em contato pelo e-mail abaixo.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Retenção de dados</h2>
            <p>Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, os dados pessoais são removidos em até 30 dias.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Contato</h2>
            <p>Para questões sobre privacidade: <a href="mailto:privacidade@speakf.com.br" className="text-violet-400 hover:text-violet-300">privacidade@speakf.com.br</a></p>
          </section>
        </div>

        <div className="mt-10 flex gap-4">
          <Link href="/terms" className="text-sm text-violet-400 hover:text-violet-300">Termos de Uso</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Voltar ao início</Link>
        </div>
      </div>
    </div>
  );
}

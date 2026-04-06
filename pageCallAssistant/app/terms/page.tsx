import Link from "next/link";
import { Mic2 } from "lucide-react";

export const metadata = { title: "Termos de Uso" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-10 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
            <Mic2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold">SpeakFlow</span>
        </Link>

        <h1 className="mb-2 text-3xl font-bold">Termos de Uso</h1>
        <p className="mb-8 text-sm text-muted-foreground">Última atualização: abril de 2025</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Aceitação dos termos</h2>
            <p>Ao criar uma conta e utilizar o SpeakFlow, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Descrição do serviço</h2>
            <p>O SpeakFlow é um aplicativo para Windows que fornece transcrição em tempo real, tradução e sugestões de resposta durante chamadas e reuniões online, utilizando inteligência artificial.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Uso aceitável</h2>
            <p>Você concorda em utilizar o serviço apenas para fins legais e conforme estes termos. É proibido usar o SpeakFlow para gravar conversas sem o consentimento dos participantes, conforme a legislação aplicável.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Créditos e pagamentos</h2>
            <p>O serviço opera por um sistema de créditos. Créditos não utilizados não são reembolsáveis. Assinaturas podem ser canceladas a qualquer momento, sem cobrança adicional.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Limitação de responsabilidade</h2>
            <p>O SpeakFlow é fornecido "no estado em que se encontra". Não garantimos precisão absoluta nas transcrições ou sugestões geradas por IA. O usuário é responsável pelo uso das informações fornecidas.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Contato</h2>
            <p>Para dúvidas sobre estes termos, entre em contato pelo e-mail: <a href="mailto:contato@call-assistant.com.br" className="text-violet-400 hover:text-violet-300">contato@call-assistant.com.br</a></p>
          </section>
        </div>

        <div className="mt-10 flex gap-4">
          <Link href="/privacy" className="text-sm text-violet-400 hover:text-violet-300">Política de Privacidade</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Voltar ao início</Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, Share, Plus, MoreVertical, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Instalar SpeakFlow Network" };

export default function InstallPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/network"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Instalar SpeakFlow Network</h1>
          <p className="text-sm text-muted-foreground">Acesse seus Circles como um app — sem App Store</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-violet-400" />
              iPhone / iPad (Safari)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold">1</span>
                <div>
                  <p className="text-sm font-medium">Abra no Safari</p>
                  <p className="text-xs text-muted-foreground">Acesse <strong>speakf.com.br/network</strong> pelo Safari do iPhone. Não funciona no Chrome ou Firefox no iOS.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold">2</span>
                <div className="flex items-start gap-2">
                  <div>
                    <p className="text-sm font-medium">Toque em Compartilhar</p>
                    <p className="text-xs text-muted-foreground">Toque no ícone de compartilhar na barra inferior do Safari</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-card border border-border/50 p-1.5">
                    <Share className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold">3</span>
                <div className="flex items-start gap-2">
                  <div>
                    <p className="text-sm font-medium">Adicionar à Tela Inicial</p>
                    <p className="text-xs text-muted-foreground">Role o menu para baixo e toque em "Adicionar à Tela de Início"</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-card border border-border/50 p-1.5">
                    <Plus className="h-4 w-4 text-green-400" />
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold">4</span>
                <div>
                  <p className="text-sm font-medium">Confirme</p>
                  <p className="text-xs text-muted-foreground">Toque em "Adicionar" no canto superior direito. O ícone aparece na sua tela inicial!</p>
                </div>
              </li>
            </ol>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-emerald-400">✓ O app abre em tela cheia, sem barra do browser, direto nos seus Circles.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-500/30 bg-indigo-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-indigo-400" />
              Android (Chrome)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">1</span>
                <div>
                  <p className="text-sm font-medium">Abra no Chrome</p>
                  <p className="text-xs text-muted-foreground">Acesse <strong>speakf.com.br/network</strong> pelo Chrome no Android.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">2</span>
                <div className="flex items-start gap-2">
                  <div>
                    <p className="text-sm font-medium">Menu do Chrome</p>
                    <p className="text-xs text-muted-foreground">Toque nos 3 pontos no canto superior direito</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-card border border-border/50 p-1.5">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">3</span>
                <div>
                  <p className="text-sm font-medium">Adicionar à tela inicial</p>
                  <p className="text-xs text-muted-foreground">Toque em "Adicionar à tela inicial" ou aguarde o banner de instalação aparecer automaticamente.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">4</span>
                <div>
                  <p className="text-sm font-medium">Instalar</p>
                  <p className="text-xs text-muted-foreground">Toque em "Instalar" na caixa de diálogo. O app aparece na sua gaveta de aplicativos.</p>
                </div>
              </li>
            </ol>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-emerald-400">✓ Funciona offline para visualizar conteúdo já carregado. Notificações futuras via push.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Desktop — Windows / Mac (Chrome ou Edge)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border border-border/50 text-muted-foreground text-xs font-bold">1</span>
              <div>
                <p className="text-sm font-medium">Abra a URL</p>
                <p className="text-xs text-muted-foreground">Acesse <strong>speakf.com.br/network</strong> no Chrome ou Edge.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border border-border/50 text-muted-foreground text-xs font-bold">2</span>
              <div>
                <p className="text-sm font-medium">Ícone na barra</p>
                <p className="text-xs text-muted-foreground">Clique no ícone de instalação (⊕) que aparece na barra de endereços.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border border-border/50 text-muted-foreground text-xs font-bold">3</span>
              <div>
                <p className="text-sm font-medium">Instalar</p>
                <p className="text-xs text-muted-foreground">Clique em "Instalar" — o app abre em janela própria com atalho na área de trabalho.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button asChild>
          <Link href="/network">Ir para meus Circles</Link>
        </Button>
      </div>
    </div>
  );
}

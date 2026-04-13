import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2, MessageSquarePlus, Mic2, Lock, ArrowRight, Zap } from "lucide-react";

export default async function ToolsPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/tools");

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { plan: true, credits: true },
  });
  if (!user) redirect("/login");

  const plan = user.plan;
  const isBasicOrAbove = plan === "basic" || plan === "premium";
  const isPremium = plan === "premium";

  const tools = [
    {
      id: "improve",
      icon: Wand2,
      title: "Melhorar Resposta",
      description: "Cole qualquer texto em inglês e receba uma versão melhorada, mais profissional e natural.",
      href: "/tools/improve",
      available: isBasicOrAbove,
      premium: false,
      badge: "Básico+",
      dailyLimit: isPremium ? "Ilimitado" : "5x por dia",
    },
    {
      id: "generate",
      icon: MessageSquarePlus,
      title: "Gerar Resposta",
      description: "Descreva a situação em português e receba 3 versões de resposta prontas em inglês.",
      href: "/tools/generate",
      available: isBasicOrAbove,
      premium: false,
      badge: "Básico+",
      dailyLimit: isPremium ? "Ilimitado" : "5x por dia",
    },
    {
      id: "interview",
      icon: Mic2,
      title: "Treino de Entrevista",
      description: "Simule uma entrevista técnica em inglês com IA. Receba feedback e sugestões de melhoria.",
      href: "/tools/interview",
      available: isBasicOrAbove,
      premium: false,
      badge: "Básico+",
      dailyLimit: isPremium ? "Ilimitado" : "3x por dia",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                <Mic2 className="h-4 w-4 text-white" />
              </div>
            </Link>
            <div>
              <h1 className="text-sm font-semibold">Ferramentas de IA</h1>
              <p className="text-xs text-muted-foreground">SpeakFlow</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <Zap className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-sm font-medium">{user.credits} créditos</span>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Ferramentas de IA</h2>
          <p className="mt-1 text-muted-foreground">
            Pratique, melhore e ganhe confiança no inglês profissional. Cada uso consome <strong>2 créditos</strong>.
          </p>
        </div>

        {!isBasicOrAbove && (
          <div className="mb-8 rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-violet-400/60" />
            <h3 className="mb-1 font-semibold">Disponível nos planos Básico e Premium</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Faça upgrade para acessar todas as ferramentas de IA e turbinar seu inglês profissional.
            </p>
            <Button variant="gradient" size="sm" asChild>
              <Link href="/pricing">Ver planos <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          {tools.map((tool) => (
            <Card
              key={tool.id}
              className={`border-border/50 transition-all ${
                tool.available
                  ? "hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/5"
                  : "opacity-60"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                    <tool.icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <Badge variant={tool.premium ? "purple" : "outline"} className="text-xs">
                    {tool.badge}
                  </Badge>
                </div>
                <CardTitle className="text-base">{tool.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {tool.available ? `📊 ${tool.dailyLimit}` : "🔒 Requer upgrade"}
                </p>
                {tool.available ? (
                  <Button variant="gradient" size="sm" className="w-full" asChild>
                    <Link href={tool.href}>
                      Usar agora <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/pricing">Fazer upgrade</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

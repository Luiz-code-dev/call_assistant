"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Zap, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface CirclePreview {
  id: string; name: string; description?: string; focus: string; level: string;
  _count: { members: number }; maxMembers: number;
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [circle, setCircle] = useState<CirclePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    fetch(`/api/network/join/${token}`)
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then(setCircle)
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  const join = async () => {
    setJoining(true);
    const r = await fetch(`/api/network/join/${token}`, { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      if (d.alreadyMember) toast.info("Você já é membro deste Circle.");
      else toast.success("Você entrou no Circle!");
      router.push(`/network/${d.circleId}`);
    } else {
      const d = await r.json();
      if (r.status === 401) {
        toast.error("Faça login para entrar no Circle.");
        router.push(`/login?redirect=/network/join/${token}`);
      } else {
        toast.error(d.error ?? "Erro ao entrar.");
        setJoining(false);
      }
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
    </div>
  );

  if (invalid) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="border-red-500/30 bg-red-500/5 max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">
            Este link de convite não existe ou foi revogado pelo dono do Circle.
          </p>
          <Button asChild variant="outline"><Link href="/network">Ver Circles públicos</Link></Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!circle) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 mx-auto shadow-lg shadow-violet-500/20">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Você foi convidado!</h1>
          <p className="text-sm text-muted-foreground">Alguém quer que você faça parte deste Circle</p>
        </div>

        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold">{circle.name}</h2>
              {circle.description && <p className="text-sm text-muted-foreground mt-1">{circle.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20">{circle.focus}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-card border border-border/50 text-muted-foreground">{circle.level}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-card border border-border/50 text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />{circle._count.members}/{circle.maxMembers} membros
              </span>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2">
              <Zap className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-300">Ao entrar, você terá acesso aos desafios, ranking e feedback com IA deste Circle.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button
            onClick={join} disabled={joining}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 h-11 text-base font-semibold"
          >
            {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5 mr-2" />Entrar no Circle</>}
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/network">Ver outros Circles</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

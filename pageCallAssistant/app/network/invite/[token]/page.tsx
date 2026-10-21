"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Zap, Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface InvitePreview {
  circleName: string; circleDescription?: string; circleFocus: string;
  circleLevel: string; circleId: string; memberCount: number;
  maxMembers: number; inviteeName: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [processing, setProcessing] = useState<"accept" | "decline" | null>(null);

  useEffect(() => {
    fetch(`/api/network/invites/${token}`)
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then(setInvite)
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  const respond = async (action: "accept" | "decline") => {
    setProcessing(action);
    const r = await fetch(`/api/network/invites/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (r.ok) {
      const d = await r.json();
      if (action === "accept") {
        toast.success("Você entrou no Circle!");
        router.push(`/network/${d.circleId}`);
      } else {
        toast.info("Convite recusado.");
        router.push("/network");
      }
    } else {
      const d = await r.json();
      if (r.status === 401) {
        toast.error("Faça login para responder ao convite.");
        router.push(`/login?redirect=/network/invite/${token}`);
      } else if (r.status === 403) {
        toast.error("Este convite foi enviado para outro usuário.");
      } else {
        toast.error(d.error ?? "Erro ao processar convite.");
      }
      setProcessing(null);
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
          <h1 className="text-xl font-bold">Convite inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este convite não existe, foi cancelado ou já foi respondido anteriormente.
          </p>
          <Button asChild variant="outline"><Link href="/network">Ver Circles</Link></Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!invite) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 mx-auto shadow-lg shadow-violet-500/20">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Convite pessoal</h1>
          <p className="text-sm text-muted-foreground">
            Você foi convidado para participar de um Circle
          </p>
        </div>

        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold">{invite.circleName}</h2>
              {invite.circleDescription && (
                <p className="text-sm text-muted-foreground mt-1">{invite.circleDescription}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20">{invite.circleFocus}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-card border border-border/50 text-muted-foreground">{invite.circleLevel}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-card border border-border/50 text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />{invite.memberCount}/{invite.maxMembers} membros
              </span>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2">
              <Zap className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-300">
                Ao aceitar, você terá acesso aos desafios, ranking com IA e à comunidade do Circle.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => respond("accept")}
            disabled={!!processing}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 h-11 text-base font-semibold"
          >
            {processing === "accept"
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <><CheckCircle2 className="h-5 w-5 mr-2" />Aceitar convite</>}
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => respond("decline")}
            disabled={!!processing}
            className="text-muted-foreground hover:text-red-400"
          >
            {processing === "decline"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><XCircle className="h-4 w-4 mr-1.5" />Recusar convite</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

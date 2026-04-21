"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Zap, ChevronRight, Clock, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Circle {
  id: string;
  name: string;
  focus: string;
  level: string;
  myRole: string;
  _count: { members: number };
  challenges: { id: string; title: string; endsAt: string }[];
}

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`h-${size} w-${size} rounded-full object-cover ring-2 ring-border`} />;
  return (
    <div className={`h-${size} w-${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-xs`}>
      {initials}
    </div>
  );
}

export default function NetworkHomePage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/network/circles?filter=mine")
      .then((r) => r.json())
      .then((data) => setCircles(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pendingChallenges = circles.flatMap((c) =>
    c.challenges.map((ch) => ({ ...ch, circleName: c.name, circleId: c.id }))
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            SpeakFlow Network
          </h1>
          <p className="text-muted-foreground mt-1">Sua comunidade de prática profissional em inglês</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/network/circles"><Users className="h-4 w-4 mr-1.5" />Descobrir Circles</Link>
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0" asChild>
            <Link href="/network/circles?create=true"><Plus className="h-4 w-4 mr-1.5" />Criar Circle</Link>
          </Button>
        </div>
      </div>

      {pendingChallenges.length > 0 && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-400" />
              Desafios pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingChallenges.map((ch) => (
              <Link key={ch.id} href={`/network/${ch.circleId}/challenge/${ch.id}`}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 hover:border-violet-500/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{ch.title}</p>
                  <p className="text-xs text-muted-foreground">{ch.circleName}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(ch.endsAt).toLocaleDateString("pt-BR")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Meus Circles {circles.length > 0 && <span className="text-sm font-normal text-muted-foreground">({circles.length})</span>}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-xl bg-card/50 animate-pulse border border-border/50" />)}
          </div>
        ) : circles.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">Você ainda não participa de nenhum Circle.</p>
              <Button asChild size="sm">
                <Link href="/network/circles">Descobrir Circles</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {circles.map((c) => (
              <Link key={c.id} href={`/network/${c.id}`}>
                <Card className="h-full border-border/50 hover:border-violet-500/40 hover:bg-card/80 transition-all cursor-pointer group">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-violet-400 transition-colors">{c.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.focus} · {c.level}</p>
                      </div>
                      {c.myRole === "owner" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 font-medium ml-2 shrink-0">owner</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c._count.members} membros</span>
                      {c.challenges.length > 0 && (
                        <span className="flex items-center gap-1 text-emerald-400"><Zap className="h-3 w-3" />Desafio ativo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver Circle <ChevronRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" asChild>
          <Link href="/network/progress"><Trophy className="h-4 w-4 mr-1.5" />Ver meu progresso</Link>
        </Button>
      </div>
    </div>
  );
}

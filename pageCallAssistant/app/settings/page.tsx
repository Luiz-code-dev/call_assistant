"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2, LogOut, ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.name) setName(data.name);
        if (data?.email) setEmail(data.email);
        if (data?.avatarUrl) setAvatarUrl(data.avatarUrl);
        if (data?.bio) setBio(data.bio);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatarUrl, bio }),
      });
      if (r.ok) toast.success("Configurações salvas!");
      else { const d = await r.json(); toast.error(d.error ?? "Erro ao salvar."); }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Mic2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">SpeakFlow</span>
          </Link>
          <button
            onClick={() => { sessionStorage.removeItem("sf_token"); localStorage.removeItem("sf_token"); window.location.href = "/api/auth/logout"; }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium text-muted-foreground hover:text-foreground h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/home"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua conta</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio <span className="text-muted-foreground text-xs font-normal">({bio.length}/300)</span></Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 300))}
                    placeholder="Conte um pouco sobre você..."
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">Aparece no seu perfil público. Máx. 300 caracteres.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">URL da foto de perfil</Label>
                  <Input
                    id="avatarUrl"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">Opcional. Usada no SpeakFlow Network. Cole a URL da sua foto (LinkedIn, GitHub, etc.).</p>
                  {avatarUrl && <img src={avatarUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover border border-border" onError={(e) => (e.currentTarget.style.display = "none")} />}
                </div>
                <Button type="submit" variant="gradient" size="sm" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Plano e cobrança</CardTitle>
              <CardDescription>Gerencie seu plano e histórico de pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/pricing">Ver planos disponíveis</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-red-400">Zona de perigo</CardTitle>
              <CardDescription>Ações irreversíveis na sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => toast.error("Entre em contato com o suporte para excluir sua conta.")}
              >
                Excluir conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

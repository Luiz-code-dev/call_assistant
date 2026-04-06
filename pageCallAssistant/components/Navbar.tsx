"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut } from "lucide-react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: string;
}

export function Navbar() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data ?? null))
      .catch(() => setUser(null));
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-lg font-semibold">SpeakFlow</span>
        </Link>

        {!user && (
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Recursos</Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</Link>
            <Link href="/#download" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Download</Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user === undefined ? null : user ? (
            <>
              <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground md:block">
                {user.name || user.email}
              </span>
              <Button variant="gradient" size="sm" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/api/auth/logout"><LogOut className="h-4 w-4" /></Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button variant="gradient" size="sm" asChild>
                <Link href="/register">Teste grátis</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

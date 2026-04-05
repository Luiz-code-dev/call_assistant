"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic2 } from "lucide-react";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
            <Mic2 className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold">Call Assistant</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Recursos
          </Link>
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Preços
          </Link>
          <Link href="/#download" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Download
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button variant="gradient" size="sm" asChild>
            <Link href="/register">Teste grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

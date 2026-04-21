import Link from "next/link";
import { Mic2, Users, Trophy, TrendingUp } from "lucide-react";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PWAInstallBanner />
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/80 backdrop-blur px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Mic2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">SpeakFlow</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/network" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <TrendingUp className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link href="/network/circles" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Users className="h-3.5 w-3.5" />
              Circles
            </Link>
            <Link href="/network/progress" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Trophy className="h-3.5 w-3.5" />
              Progresso
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpeakFlow Live — Copiloto em Tempo Real",
  description: "Tradução instantânea e sugestões com IA durante suas conversas em inglês.",
  manifest: "/live-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpeakFlow Live",
  },
  themeColor: "#ef4444",
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}

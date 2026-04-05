import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://call-assistant.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Call Assistant — Copiloto de chamadas em tempo real",
    template: "%s | Call Assistant",
  },
  description:
    "Transcrição, tradução e sugestões inteligentes durante suas entrevistas e reuniões. Em tempo real, no seu Windows.",
  keywords: ["call assistant", "transcrição em tempo real", "tradução", "IA", "entrevista", "copilot", "reunião"],
  authors: [{ name: "Call Assistant" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: APP_URL,
    siteName: "Call Assistant",
    title: "Call Assistant — Copiloto de chamadas em tempo real",
    description:
      "Transcrição, tradução e sugestões inteligentes durante suas entrevistas e reuniões. Em tempo real, no seu Windows.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Call Assistant — Copiloto de chamadas em tempo real",
    description: "Transcrição, tradução e sugestões inteligentes em tempo real.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

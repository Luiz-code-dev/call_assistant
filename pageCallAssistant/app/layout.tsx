import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://speakf.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "SpeakFlow — Entenda em tempo real. Responda com confiança.",
    template: "%s | SpeakFlow",
  },
  description:
    "Transcrição, tradução e sugestões inteligentes durante suas entrevistas e reuniões. Em tempo real, no seu Windows.",
  keywords: ["speakflow", "transcrição em tempo real", "tradução", "IA", "entrevista", "copilot", "reunião"],
  authors: [{ name: "SpeakFlow" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: APP_URL,
    siteName: "SpeakFlow",
    title: "SpeakFlow — Entenda em tempo real. Responda com confiança.",
    description:
      "Transcrição, tradução e sugestões inteligentes durante suas entrevistas e reuniões. Em tempo real, no seu Windows.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpeakFlow — Entenda em tempo real. Responda com confiança.",
    description: "Transcrição, tradução e sugestões inteligentes em tempo real.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
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

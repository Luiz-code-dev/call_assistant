import type { Metadata } from "next";

const ESCOLA_URL =
  process.env.NEXT_PUBLIC_APP_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://speakflow.ia.br";

export const metadata: Metadata = {
  metadataBase: new URL(ESCOLA_URL),
  title: {
    default: "SpeakFlow Escolas",
    template: "%s | SpeakFlow Escolas",
  },
  description:
    "Plataforma educacional SpeakFlow para redes municipais de ensino. Registro de chamadas, diários, avaliações e muito mais.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: `${ESCOLA_URL}/escola/entrar`,
    siteName: "SpeakFlow Escolas",
    title: "SpeakFlow Escolas",
    description:
      "Plataforma educacional SpeakFlow para redes municipais de ensino. Acesso restrito a membros da rede.",
  },
  twitter: {
    card: "summary",
    title: "SpeakFlow Escolas",
    description: "Plataforma educacional para redes municipais de ensino.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function EscolaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

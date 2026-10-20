import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpeakFlow Escolas",
  description: "Área educacional SpeakFlow",
};

export default function EscolaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

"use client";
/**
 * Peças visuais do reforço (aluno e família): mesma cara em todas as telas.
 * Só apresentação: nenhuma regra de negócio aqui.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookA, Calculator, FlaskConical, Landmark, Globe, Palette, Dumbbell, Languages, HeartHandshake,
  ChevronLeft, House, Route, ClipboardList, TrendingUp, Users, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Icone = LucideIcon;

export const MATERIAS: Record<string, { nome: string; cor: string; Icone: Icone }> = {
  LP: { nome: "Língua Portuguesa", cor: "#BE185D", Icone: BookA },
  MA: { nome: "Matemática", cor: "#1D4ED8", Icone: Calculator },
  CI: { nome: "Ciências", cor: "#0F766E", Icone: FlaskConical },
  HI: { nome: "História", cor: "#C2410C", Icone: Landmark },
  GE: { nome: "Geografia", cor: "#15803D", Icone: Globe },
  AR: { nome: "Arte", cor: "#7C3AED", Icone: Palette },
  EF: { nome: "Educação Física", cor: "#0369A1", Icone: Dumbbell },
  LI: { nome: "Língua Inglesa", cor: "#6D28D9", Icone: Languages },
  ER: { nome: "Ensino Religioso", cor: "#92400E", Icone: HeartHandshake },
};

const APELIDOS: Record<string, string> = {
  "português": "LP", "portugues": "LP", "língua portuguesa": "LP", "matemática": "MA", "matematica": "MA",
  "ciências": "CI", "ciencias": "CI", "história": "HI", "historia": "HI", "geografia": "GE", "arte": "AR",
  "educação física": "EF", "educacao fisica": "EF", "inglês": "LI", "ingles": "LI", "língua inglesa": "LI",
  "ensino religioso": "ER",
};

/** Aceita código (MA), nome ("Matemática") ou id de matéria; devolve a matéria ou null */
export function materiaDe(chave: string | null | undefined) {
  if (!chave) return null;
  const k = chave.trim();
  if (MATERIAS[k.toUpperCase()]) return MATERIAS[k.toUpperCase()];
  const ap = APELIDOS[k.toLowerCase()];
  if (ap) return MATERIAS[ap];
  const m = k.toUpperCase().match(/(?:^|[^A-Z])(LP|MA|CI|HI|GE|AR|EF|LI|ER)(?:[^A-Z]|$)/);
  return m ? MATERIAS[m[1]] : null;
}

export const FUNDO = "min-h-screen bg-[#F6F4FE]";
export const CARTAO = "rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)]";
export const BOTAO = "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[52px] px-5 transition-colors disabled:opacity-50";
export const BOTAO_CLARO = "inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-[#5B5470] font-semibold min-h-[48px] px-5 shadow-[0_2px_10px_rgba(91,33,182,0.08)]";

/** Capa colorida do topo, com voltar opcional */
export function Capa({
  titulo, subtitulo, voltar, cor, direita, children, compacta, largo,
}: {
  titulo: ReactNode; subtitulo?: ReactNode; voltar?: { href?: string; onClick?: () => void; texto?: string };
  cor?: string; direita?: ReactNode; children?: ReactNode; compacta?: boolean; largo?: boolean;
}) {
  const fundo = cor
    ? `linear-gradient(135deg, ${cor}, ${cor}CC)`
    : "linear-gradient(135deg, #5B21B6, #6D28D9 55%, #8B5CF6)";
  const BotaoVoltar = voltar ? (
    voltar.href ? (
      <Link href={voltar.href} className="inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 pl-2 pr-3 min-h-[40px] text-sm font-semibold">
        <ChevronLeft className="size-4" />{voltar.texto ?? "Voltar"}
      </Link>
    ) : (
      <button onClick={voltar.onClick} className="inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 pl-2 pr-3 min-h-[40px] text-sm font-semibold">
        <ChevronLeft className="size-4" />{voltar.texto ?? "Voltar"}
      </button>
    )
  ) : <span />;
  return (
    <header className="relative overflow-hidden rounded-b-[28px] text-white" style={{ background: fundo }}>
      <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-white/10" />
      <div className="absolute top-20 -left-10 w-28 h-28 rounded-full bg-white/5" />
      <div className={`relative ${largo ? "max-w-5xl" : "max-w-3xl"} mx-auto px-5 pt-4 ${compacta ? "pb-6" : "pb-16"}`}>
        <div className="flex items-center justify-between min-h-[44px]">{BotaoVoltar}{direita}</div>
        <div className="mt-2">
          <h1 className="text-2xl font-extrabold leading-tight">{titulo}</h1>
          {subtitulo && <p className="text-sm text-white/85 mt-1">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}

/** Conteúdo que sobe por cima da capa */
export function Conteudo({ children, sobreCapa = true, largo }: { children: ReactNode; sobreCapa?: boolean; largo?: boolean }) {
  return <main className={`relative ${largo ? "max-w-5xl" : "max-w-3xl"} mx-auto px-4 ${sobreCapa ? "-mt-10" : "mt-5"} space-y-5 pb-28`}>{children}</main>;
}

type ItemNav = { href: string; icon: Icone; label: string; chave: string };

function Nav({ itens, ativo }: { itens: ItemNav[]; ativo: string }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-[#EDE9F7] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto grid" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
        {itens.map(({ href, icon: Icon, label, chave }) => {
          const on = chave === ativo;
          return (
            <Link key={chave} href={href}
              className={`flex flex-col items-center gap-1 py-2.5 min-h-[56px] text-[11px] font-semibold ${on ? "text-[#6D28D9]" : "text-[#8B84A0]"}`}>
              <span className={`px-4 py-1 rounded-full ${on ? "bg-[#EDE9FE]" : ""}`}><Icon className="size-5" /></span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function NavAluno({ ativo }: { ativo: "inicio" | "trilha" | "feitas" | "evolucao" | "" }) {
  return (
    <Nav ativo={ativo} itens={[
      { chave: "inicio", href: "/escola/aluno", icon: House, label: "Início" },
      { chave: "trilha", href: "/escola/aluno/trilha", icon: Route, label: "Trilha" },
      { chave: "feitas", href: "/escola/aluno/atividades/historico", icon: ClipboardList, label: "Feitas" },
      { chave: "evolucao", href: "/escola/aluno/evolucao", icon: TrendingUp, label: "Evolução" },
    ]} />
  );
}

export function NavFamilia({ ativo }: { ativo: "filhos" | "config" | "" }) {
  return (
    <Nav ativo={ativo} itens={[
      { chave: "filhos", href: "/escola/familia", icon: Users, label: "Meus filhos" },
      { chave: "config", href: "/escola/familia/configuracoes", icon: Settings, label: "Configurações" },
    ]} />
  );
}

/** Selo de nível, sem nota: só palavras */
const NIVEIS: Record<string, { label: string; cls: string }> = {
  MASTERED: { label: "Domina", cls: "bg-[#DCFCE7] text-[#166534]" },
  DOMINA: { label: "Domina", cls: "bg-[#DCFCE7] text-[#166534]" },
  ALMOST: { label: "Quase lá", cls: "bg-[#FEF3C7] text-[#92400E]" },
  QUASE_LA: { label: "Quase lá", cls: "bg-[#FEF3C7] text-[#92400E]" },
  NOT_YET: { label: "Praticando", cls: "bg-[#EDE9FE] text-[#6D28D9]" },
  AINDA_NAO: { label: "Praticando", cls: "bg-[#EDE9FE] text-[#6D28D9]" },
};
export function SeloNivel({ nivel }: { nivel: string | null | undefined }) {
  const n = nivel ? NIVEIS[nivel] : null;
  if (!n) return null;
  return <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${n.cls}`}>{n.label}</span>;
}

/** Tela de carregando com a mesma capa */
export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className={`${FUNDO} flex flex-col items-center justify-center gap-3`}>
      <div className="size-12 rounded-full border-4 border-[#EDE9FE] border-t-[#6D28D9] animate-spin" />
      <p className="text-sm text-[#5B5470]">{texto}</p>
    </div>
  );
}

/** Ícone redondo da matéria */
export function IconeMateria({ chave, tamanho = 48 }: { chave: string | null | undefined; tamanho?: number }) {
  const m = materiaDe(chave);
  const cor = m?.cor ?? "#6D28D9";
  const I = m?.Icone ?? Route;
  return (
    <div className="rounded-2xl flex items-center justify-center text-white shrink-0"
      style={{ width: tamanho, height: tamanho, background: `linear-gradient(135deg, ${cor}, ${cor}D9)` }}>
      <I className="size-1/2" strokeWidth={2.2} />
    </div>
  );
}

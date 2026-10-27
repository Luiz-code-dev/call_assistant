import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, HeartHandshake, School, ArrowRight } from "lucide-react";
import { STAFF_COOKIE, STUDENT_COOKIE, FAMILY_COOKIE } from "@/lib/escola/cookies";
import { envFlag } from "@/lib/escola/feature-flag";

export const dynamic = "force-dynamic";

export default function InicioPage() {
  // Decisao no servidor (os cookies sao httpOnly; JS no cliente nunca os le).
  const c = cookies();
  if (c.get(STAFF_COOKIE)) redirect("/escola/painel");
  if (c.get(STUDENT_COOKIE)) redirect("/escola/aluno/trilha");
  if (c.get(FAMILY_COOKIE)) redirect("/escola/familia");

  const familyEnabled = envFlag(process.env.FEATURE_ESCOLAS_FAMILIA, true);
  const roles = [
    { href: "/escola/aluno/entrar", icon: GraduationCap, title: "Sou aluno", description: "Acesse sua trilha de reforço e pratique suas habilidades" },
    ...(familyEnabled ? [{ href: "/escola/familia/entrar", icon: HeartHandshake, title: "Sou pai, mãe ou responsável", description: "Acompanhe a evolução escolar do seu filho" }] : []),
    { href: "/escola/entrar", icon: School, title: "Sou da equipe escolar", description: "Professor, coordenador, diretor ou administrador" },
  ];

  return (
    <div className="theme-escola min-h-screen bg-[#F8F7FC] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#6D28D9] flex items-center justify-center">
              <span className="text-white text-base font-bold">S</span>
            </div>
            <span className="text-[#1F1A2E] text-xl font-bold tracking-tight">SpeakFlow</span>
            <span className="text-[#BE185D] text-xl font-bold">Escolas</span>
          </div>
          <p className="text-[#5B5470] text-sm">Como você quer entrar?</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.href} href={r.href} className="flex items-center gap-4 bg-white border border-[#E9E5F5] hover:border-[#C4B5FD] rounded-2xl p-5 transition-all active:scale-[0.98] group">
                <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                  <Icon size={26} className="text-[#6D28D9]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1F1A2E] font-semibold text-base">{r.title}</p>
                  <p className="text-[#5B5470] text-xs mt-0.5 leading-snug">{r.description}</p>
                </div>
                <ArrowRight size={18} className="text-[#6D28D9] group-hover:translate-x-1 transition-transform" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="text-center pb-8 text-[#5B5470] text-xs">
        SpeakFlow Escolas · Reforço que se ajusta a cada aluno
      </div>
    </div>
  );
}

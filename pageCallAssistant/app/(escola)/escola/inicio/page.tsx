"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const roles = [
  {
    href: "/escola/aluno/entrar",
    icon: "🎒",
    title: "Sou aluno",
    description: "Acesse sua trilha de reforço e pratique suas habilidades",
    color: "from-violet-600 to-purple-700",
    border: "border-purple-600",
    text: "text-purple-400",
  },
  {
    href: "/escola/familia/entrar",
    icon: "👨‍👩‍👧",
    title: "Sou responsável",
    description: "Acompanhe a evolução escolar do seu filho",
    color: "from-emerald-600 to-teal-700",
    border: "border-emerald-600",
    text: "text-emerald-400",
  },
  {
    href: "/escola/entrar",
    icon: "🏫",
    title: "Sou da equipe escolar",
    description: "Professor, coordenador, diretor ou administrador",
    color: "from-blue-600 to-indigo-700",
    border: "border-blue-600",
    text: "text-blue-400",
  },
];

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  return document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1] ?? null;
}

export default function InicioPage() {
  const router = useRouter();

  useEffect(() => {
    if (getCookie("sf_edu_ctx"))     { router.replace("/escola/painel"); return; }
    if (getCookie("sf_edu_student")) { router.replace("/escola/aluno/trilha"); return; }
    if (getCookie("sf_family_ctx"))  { router.replace("/escola/familia"); return; }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">

        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
              <span className="text-white text-base font-bold">S</span>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">SpeakFlow</span>
            <span className="text-purple-400 text-xl font-bold">Escolas</span>
          </div>
          <p className="text-gray-400 text-sm">Como você quer entrar?</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {roles.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className={`flex items-center gap-4 bg-gray-900 border ${r.border}/40 hover:${r.border} rounded-2xl p-5 transition-all active:scale-[0.98] group`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base">{r.title}</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-snug">{r.description}</p>
              </div>
              <span className={`${r.text} text-lg group-hover:translate-x-1 transition-transform`}>→</span>
            </Link>
          ))}
        </div>

      </div>

      <div className="text-center pb-8 text-gray-700 text-xs">
        SpeakFlow Escolas · Reforço que se ajusta a cada aluno
      </div>
    </div>
  );
}

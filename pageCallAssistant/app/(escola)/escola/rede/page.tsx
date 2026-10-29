import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import {
  School,
  Users,
  UserPlus,
  Activity,
  BookOpen,
  ListChecks,
  ArrowRight,
  AlertTriangle,
  Info,
  Upload,
} from "lucide-react";

export default async function RedePage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  if (ctx.role !== "NETWORK_ADMIN") redirect("/escola/painel");

  const nid = ctx.networkId;

  const [network, schools, currentYear] = await Promise.all([
    prismaEdu.eduNetwork.findUnique({ where: { id: nid } }),
    prismaEdu.eduSchool.findMany({
      where: { networkId: nid },
      orderBy: { name: "asc" },
      select: { id: true, name: true, inepCode: true },
    }),
    prismaEdu.eduSchoolYear.findFirst({
      where: { networkId: nid, isCurrent: true },
      include: { terms: { orderBy: { startsAt: "asc" } } },
    }),
  ]);

  const [studentCount, memberCount, pendingInvites] = await Promise.all([
    prismaEdu.eduStudent.count({ where: { networkId: nid, isActive: true } }),
    prismaEdu.eduMembership.count({ where: { networkId: nid, isActive: true } }),
    prismaEdu.eduInvite.count({ where: { networkId: nid, acceptedAt: null } }),
  ]);

  // Implantação: contar etapas concluídas (0–8)
  const [hasSchools, hasYear, hasMemberships, hasStudents] = await Promise.all([
    prismaEdu.eduSchool.count({ where: { networkId: nid } }).then((c: number) => c > 0),
    prismaEdu.eduSchoolYear.count({ where: { networkId: nid } }).then((c: number) => c > 0),
    prismaEdu.eduMembership.count({ where: { networkId: nid } }).then((c: number) => c > 0),
    prismaEdu.eduStudent.count({ where: { networkId: nid } }).then((c: number) => c > 0),
  ]);

  const implantacaoSteps = [hasSchools, hasYear, false, hasStudents, hasStudents, hasMemberships, false, false];
  const stepsOk = implantacaoSteps.filter(Boolean).length;
  const implantacaoConcluida = stepsOk >= 8;

  const STEP_LABELS = [
    "Escolas", "Ano letivo", "Matriz curricular", "Servidores",
    "Turmas e alunos", "Atribuições", "Cartões de acesso", "Revisão",
  ];
  const nextPendingStep = implantacaoSteps.findIndex((s) => !s);
  const nextStepLabel = nextPendingStep >= 0 ? STEP_LABELS[nextPendingStep] : null;

  // Período atual
  const now = new Date();
  type Term = typeof currentYear extends { terms: Array<infer T> } ? T : never;
  const currentTerm = currentYear?.terms.find(
    (t: Term) => new Date((t as { startsAt: Date | string }).startsAt) <= now && new Date((t as { endsAt: Date | string }).endsAt) >= now
  );
  const daysToEndTerm = currentTerm
    ? Math.ceil((new Date(currentTerm.endsAt).getTime() - now.getTime()) / 86400000)
    : null;

  // Alertas dinâmicos
  type Alert = { msg: string; href: string; level: "warn" | "info" };
  const alerts: Alert[] = [];
  if (pendingInvites > 0) alerts.push({ msg: `${pendingInvites} convite${pendingInvites > 1 ? "s" : ""} pendente${pendingInvites > 1 ? "s" : ""} há mais de 3 dias`, href: "/escola/rede/servidores", level: "warn" });
  if (daysToEndTerm !== null && daysToEndTerm <= 7 && daysToEndTerm >= 0) alerts.push({ msg: `Fim do período em ${daysToEndTerm} dia${daysToEndTerm !== 1 ? "s" : ""}`, href: "/escola/rede/anos-letivos", level: "info" });
  if (!hasYear) alerts.push({ msg: "Nenhum ano letivo configurado", href: "/escola/rede/anos-letivos", level: "warn" });

  const yearLabel = currentYear ? `${currentYear.year}` : null;

  // Estado vazio — rede sem escolas, ano letivo ou membros
  const isEmpty = !hasSchools && !hasYear && !hasMemberships;

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede" }]}
        title={network?.name ?? "Visão geral"}
        subtitle={network ? `${network.city}, ${network.state}${yearLabel ? ` — Ano letivo ${yearLabel}` : ""}` : undefined}
        action={
          <Link
            href="/escola/rede/implantacao"
            className="inline-flex items-center gap-2 border border-gray-300 hover:border-indigo-400 text-gray-700 hover:text-indigo-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <Upload size={14} />
            Importar planilha
          </Link>
        }
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full space-y-6">

        {/* Estado vazio */}
        {isEmpty && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-6 py-10 text-center">
            <ListChecks size={32} className="text-indigo-400 mx-auto mb-3" />
            <h2 className="text-[18px] font-bold text-gray-900 mb-1">Vamos implantar a rede</h2>
            <p className="text-[14px] text-[#5B5470] mb-5">São 8 etapas e a maior parte é feita por planilha.</p>
            <Link
              href="/escola/rede/implantacao"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            >
              Começar implantação
            </Link>
          </div>
        )}

        {/* Barra de implantação (só enquanto não concluída) */}
        {!isEmpty && !implantacaoConcluida && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListChecks size={16} className="text-indigo-600" />
                <span className="text-[14px] font-semibold text-gray-800">
                  Implantação — {stepsOk} de 8 etapas
                </span>
              </div>
              {nextStepLabel && (
                <span className="text-[12px] text-[#5B5470]">Próximo: {nextStepLabel}</span>
              )}
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${(stepsOk / 8) * 100}%` }}
              />
            </div>
            <Link
              href="/escola/rede/implantacao"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Continuar implantação <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* KPIs */}
        {!isEmpty && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                label: "Escolas", value: schools.length,
                href: "/escola/rede/escolas", icon: <School size={18} className="text-indigo-600" />, bg: "bg-indigo-50",
              },
              {
                label: "Alunos ativos", value: studentCount,
                href: "/escola/rede/turmas", icon: <Users size={18} className="text-emerald-600" />, bg: "bg-emerald-50",
              },
              {
                label: "Servidores com acesso", value: memberCount,
                sub: pendingInvites > 0 ? `${pendingInvites} convite${pendingInvites > 1 ? "s" : ""} pendente${pendingInvites > 1 ? "s" : ""}` : undefined,
                href: "/escola/rede/servidores", icon: <UserPlus size={18} className="text-violet-600" />, bg: "bg-violet-50",
              },
              {
                label: "Atividades na semana", value: "—",
                href: "/escola/rede/indicadores", icon: <Activity size={18} className="text-amber-600" />, bg: "bg-amber-50",
              },
              {
                label: "Notas do período", value: "—",
                href: "/escola/rede/indicadores", icon: <BookOpen size={18} className="text-rose-600" />, bg: "bg-rose-50",
              },
            ].map((k) => (
              <Link
                key={k.href + k.label}
                href={k.href}
                className={`${k.bg} rounded-xl p-4 border border-white/60 hover:shadow-sm transition-shadow group`}
              >
                <div className="mb-2">{k.icon}</div>
                <div className="text-[26px] font-extrabold text-gray-900 leading-none">{k.value}</div>
                <div className="text-[12px] text-[#5B5470] mt-0.5 group-hover:text-indigo-700 transition-colors">{k.label}</div>
                {k.sub && <div className="text-[11px] text-amber-700 mt-0.5">{k.sub}</div>}
              </Link>
            ))}
          </div>
        )}

        {/* Alertas + Uso por componente */}
        {!isEmpty && (alerts.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Precisa de atenção */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-[13px] font-semibold text-gray-700">Precisa de atenção</span>
              </div>
              <div className="divide-y divide-gray-100">
                {alerts.map((a, i) => (
                  <Link
                    key={i}
                    href={a.href}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    {a.level === "warn"
                      ? <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                      : <Info size={15} className="text-blue-500 shrink-0" />
                    }
                    <span className="text-[13px] text-gray-700 flex-1">{a.msg}</span>
                    <ArrowRight size={13} className="text-[#5B5470] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Uso por componente — placeholder até dados reais */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-gray-700">Uso por componente (semana)</span>
                <Link href="/escola/rede/indicadores" className="text-[12px] text-indigo-600 hover:underline">Ver tudo</Link>
              </div>
              <div className="px-5 py-4 text-[13px] text-[#5B5470] text-center">
                Disponível após lançamento de atividades.
              </div>
            </div>
          </div>
        )}

        {/* Tabela de escolas */}
        {schools.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-700">Escolas</span>
              <Link href="/escola/rede/escolas" className="text-[12px] text-indigo-600 hover:underline">Gerenciar</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[#5B5470] text-[12px] border-b border-gray-100">
                    <th className="px-5 py-2.5 font-medium">Escola</th>
                    <th className="px-4 py-2.5 font-medium">INEP</th>
                    <th className="px-4 py-2.5 font-medium text-right">Alunos</th>
                    <th className="px-4 py-2.5 font-medium text-right">Professores</th>
                    <th className="px-4 py-2.5 font-medium text-right">Notas lançadas</th>
                    <th className="px-4 py-2.5 font-medium text-right">Atividades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schools.map((s: typeof schools[number]) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/escola/rede/escolas/${s.id}`} className="text-indigo-700 hover:underline font-medium">
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#5B5470] font-mono text-[12px]">{s.inepCode ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-700">—</td>
                      <td className="px-4 py-3 text-right text-gray-700">—</td>
                      <td className="px-4 py-3 text-right text-[#5B5470]">—</td>
                      <td className="px-4 py-3 text-right text-[#5B5470]">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

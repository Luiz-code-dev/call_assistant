"use client";
/**
 * Retornos para revisar: cada entrega dos alunos nas atividades do professor, com o retorno
 * que o Flow deu. O professor abre, lê o que o Flow disse e segue para confirmar ou ajustar.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, Inbox, ThumbsUp, Lightbulb, Plus } from "lucide-react";

interface Retorno {
  id: string; activityId: string; studentName: string; activityTitle: string; turma: string; materia: string;
  status: string; masteryLevel: string | null; flagged: boolean; submittedAt: string | null;
  acertos: string[]; melhorar: string[]; observacao: string | null;
}
type Filtro = "revisar" | "sinalizados" | "revisados";

const NIVEL: Record<string, { rotulo: string; texto: string; fundo: string }> = {
  MASTERED: { rotulo: "Domina", texto: "#166534", fundo: "#DCFCE7" },
  ALMOST: { rotulo: "Quase lá", texto: "#92400E", fundo: "#FEF3C7" },
  NOT_YET: { rotulo: "Ainda não", texto: "#B91C1C", fundo: "#FEE2E2" },
};

function quando(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  return d.toLocaleDateString("pt-BR");
}
const iniciais = (nome: string) => nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export default function RetornosPage() {
  const [lista, setLista] = useState<Retorno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("revisar");
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/escola/professor/retornos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setLista(d.submissions ?? []); setCarregando(false); })
      .catch(() => { setErro("Não foi possível carregar os retornos."); setCarregando(false); });
  }, []);

  const grupos = useMemo(() => ({
    revisar: lista.filter((s) => s.status !== "REVIEWED"),
    sinalizados: lista.filter((s) => s.flagged && s.status !== "REVIEWED"),
    revisados: lista.filter((s) => s.status === "REVIEWED"),
  }), [lista]);
  const visiveis = grupos[filtro];

  const abas: { id: Filtro; nome: string }[] = [
    { id: "revisar", nome: "Para revisar" },
    { id: "sinalizados", nome: "Com atenção" },
    { id: "revisados", nome: "Revisados" },
  ];
  const vazio: Record<Filtro, { titulo: string; texto: string }> = {
    revisar: { titulo: "Nada para revisar agora.", texto: "Quando um aluno entregar uma atividade sua, o retorno do Flow aparece aqui para você conferir." },
    sinalizados: { titulo: "Nenhuma entrega com atenção.", texto: "Aqui ficam as entregas que o Flow não conseguiu ler sozinho e que precisam do seu olhar." },
    revisados: { titulo: "Você ainda não revisou entregas.", texto: "As entregas que você confirmar ficam guardadas aqui." },
  };

  return (
    <div className="px-4 sm:px-7 py-6 sm:py-8 max-w-3xl mx-auto">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0"><MessageSquare size={22} /></span>
        <div className="min-w-0">
          <h1 className="text-[#1F1A2E] font-extrabold text-[22px] sm:text-2xl leading-tight">Retornos para revisar</h1>
          <p className="text-[#5B5470] text-[14px] leading-snug mt-1">Quando o aluno entrega uma atividade sua, o Flow lê e dá um primeiro retorno. Aqui você confere esse retorno e confirma ou ajusta. A palavra final é sua.</p>
        </div>
      </div>

      <div role="tablist" aria-label="Retornos" className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-[#EFEDF5] p-1">
        {abas.map((a) => (
          <button key={a.id} role="tab" aria-selected={filtro === a.id} onClick={() => { setFiltro(a.id); setAberto(null); }}
            className={`min-h-[52px] rounded-xl px-1 text-[13px] font-bold leading-tight transition-colors ${filtro === a.id ? "bg-white text-[#6D28D9] shadow-sm" : "text-[#5B5470]"}`}>
            <span className="block text-[18px] font-extrabold">{carregando ? "-" : grupos[a.id].length}</span>
            {a.nome}
          </button>
        ))}
      </div>

      {erro && <p role="alert" className="text-[#B91C1C] text-sm mt-5">{erro}</p>}
      {carregando ? <p className="text-[#5B5470] text-center py-10">Carregando...</p> : erro ? null : !visiveis.length ? (
        <div className="mt-5 bg-white border border-[#E9E5F5] rounded-2xl p-8 text-center">
          {filtro === "revisados" ? <CheckCircle2 className="mx-auto text-[#C4B5FD] mb-3" size={40} /> : <Inbox className="mx-auto text-[#C4B5FD] mb-3" size={40} />}
          <p className="text-[#1F1A2E] font-semibold">{vazio[filtro].titulo}</p>
          <p className="text-[#5B5470] text-[14px] mt-1">{vazio[filtro].texto}</p>
          {filtro === "revisar" && !lista.length && (
            <Link href="/escola/professor/atividades/nova" className="mt-4 inline-flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 rounded-xl text-sm font-bold min-h-[44px]">
              <Plus size={15} />Criar uma atividade
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {visiveis.map((s) => {
            const nivel = s.masteryLevel ? NIVEL[s.masteryLevel] : null;
            const expandido = aberto === s.id;
            const lendo = s.status === "SUBMITTED" && !s.flagged;
            return (
              <li key={s.id} className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
                <button onClick={() => setAberto(expandido ? null : s.id)} aria-expanded={expandido} className="w-full text-left p-4 flex items-start gap-3">
                  <span className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#5B21B6] text-[13px] font-extrabold flex items-center justify-center shrink-0">{iniciais(s.studentName)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-bold text-[#1F1A2E] break-words">{s.studentName}</span>
                    <span className="block text-[14px] text-[#3B3550] break-words">{s.activityTitle}</span>
                    <span className="block text-[12px] text-[#5B5470] mt-0.5">{[s.turma, s.materia, quando(s.submittedAt)].filter(Boolean).join(" · ")}</span>
                    <span className="flex flex-wrap gap-1.5 mt-2">
                      {nivel && <span className="text-[12px] font-bold rounded-full px-2.5 py-1" style={{ background: nivel.fundo, color: nivel.texto }}>{nivel.rotulo}</span>}
                      {s.flagged && <span className="inline-flex items-center gap-1 text-[12px] font-bold rounded-full px-2.5 py-1 bg-[#FEF3C7] text-[#92400E]"><AlertTriangle size={12} />Precisa do seu olhar</span>}
                      {lendo && <span className="inline-flex items-center gap-1 text-[12px] font-bold rounded-full px-2.5 py-1 bg-[#F1EEF9] text-[#5B5470]"><Clock size={12} />O Flow está lendo</span>}
                      {s.status === "REVIEWED" && <span className="inline-flex items-center gap-1 text-[12px] font-bold rounded-full px-2.5 py-1 bg-[#DCFCE7] text-[#166534]"><CheckCircle2 size={12} />Revisado por você</span>}
                    </span>
                  </span>
                  <ChevronDown size={18} className={`text-[#8B84A0] shrink-0 mt-1 transition-transform ${expandido ? "rotate-180" : ""}`} />
                </button>
                {expandido && (
                  <div className="border-t border-[#F1EEF9] p-4 space-y-3 bg-[#FBFAFF]">
                    {s.flagged ? (
                      <p className="text-[14px] text-[#92400E]">O Flow não conseguiu dar o retorno desta entrega. Abra a entrega para ler e responder ao aluno.</p>
                    ) : !s.acertos.length && !s.melhorar.length ? (
                      <p className="text-[14px] text-[#5B5470]">{lendo ? "O retorno do Flow ainda está sendo preparado." : "Esta entrega não tem comentários do Flow. Abra para ver as respostas."}</p>
                    ) : (
                      <>
                        {!!s.acertos.length && (
                          <div>
                            <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-[#166534]"><ThumbsUp size={13} />O que o Flow elogiou</p>
                            <ul className="mt-1 space-y-1">{s.acertos.map((t) => <li key={t} className="text-[14px] text-[#1F1A2E] leading-snug break-words">{t}</li>)}</ul>
                          </div>
                        )}
                        {!!s.melhorar.length && (
                          <div>
                            <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-[#92400E]"><Lightbulb size={13} />O que o Flow sugeriu melhorar</p>
                            <ul className="mt-1 space-y-1">{s.melhorar.map((t) => <li key={t} className="text-[14px] text-[#1F1A2E] leading-snug break-words">{t}</li>)}</ul>
                          </div>
                        )}
                      </>
                    )}
                    {s.observacao && <p className="text-[14px] text-[#3B3550] bg-white border border-[#E9E5F5] rounded-xl px-3 py-2"><b>Sua observação:</b> {s.observacao}</p>}
                    <Link href={`/escola/professor/atividades/${s.activityId}/entregas?entrega=${s.id}`}
                      className="w-full min-h-[48px] rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-[14px] font-bold inline-flex items-center justify-center gap-1.5">
                      {s.status === "REVIEWED" ? "Ver a entrega" : "Abrir a entrega e revisar"}<ChevronRight size={16} />
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

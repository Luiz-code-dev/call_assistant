/**
 * "Semana do seu filho": os últimos 7 dias (até hoje), dia a dia e por matéria.
 * Só palavras e contagens, nunca nota. Função pura: recebe as entregas já lidas do banco.
 */

export type Nivel = "MASTERED" | "ALMOST" | "NOT_YET";

export interface EntregaSemana {
  quando: Date;
  materia: string | null; // código (MA, LP...)
  nivel: Nivel | null;
  minutos: number;
}

export interface DiaSemana {
  dia: string;     // AAAA-MM-DD (São Paulo)
  rotulo: string;  // "Seg", "Ter"... ou "Hoje"
  atividades: number;
  minutos: number;
  domina: number;
  quase: number;
  praticando: number;
}

export interface MateriaSemana {
  codigo: string;
  atividades: number;
  domina: number;
  quase: number;
  praticando: number;
  situacao: "indo_bem" | "atencao" | "praticando";
}

export interface Semana {
  dias: DiaSemana[];
  materias: MateriaSemana[];
  total: { atividades: number; minutos: number; diasEstudados: number };
  tendencia: "subindo" | "caindo" | "estavel" | "sem_dados";
  frase: string;
}

const ROTULOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function diaSaoPaulo(d: Date): string {
  return new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function rotuloDe(dia: string, hoje: string): string {
  if (dia === hoje) return "Hoje";
  const wd = (new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7;
  return ROTULOS[wd];
}

export function montarSemana(entregas: EntregaSemana[], primeiroNome: string, nomeMateria: (c: string) => string, now = new Date()): Semana {
  const hoje = diaSaoPaulo(now);
  const dias: DiaSemana[] = [];
  for (let i = 6; i >= 0; i--) {
    const dia = diaSaoPaulo(new Date(now.getTime() - i * 86_400_000));
    dias.push({ dia, rotulo: rotuloDe(dia, hoje), atividades: 0, minutos: 0, domina: 0, quase: 0, praticando: 0 });
  }
  const porDia = new Map(dias.map((d) => [d.dia, d]));
  const porMateria = new Map<string, MateriaSemana>();

  for (const e of entregas) {
    const d = porDia.get(diaSaoPaulo(e.quando));
    if (!d) continue;
    d.atividades++;
    d.minutos += e.minutos;
    if (e.nivel === "MASTERED") d.domina++;
    else if (e.nivel === "ALMOST") d.quase++;
    else if (e.nivel === "NOT_YET") d.praticando++;
    if (e.materia) {
      const m = porMateria.get(e.materia) ?? { codigo: e.materia, atividades: 0, domina: 0, quase: 0, praticando: 0, situacao: "praticando" as const };
      m.atividades++;
      if (e.nivel === "MASTERED") m.domina++;
      else if (e.nivel === "ALMOST") m.quase++;
      else if (e.nivel === "NOT_YET") m.praticando++;
      porMateria.set(e.materia, m);
    }
  }

  const materias = Array.from(porMateria.values()).map((m) => {
    const avaliadas = m.domina + m.quase + m.praticando;
    const situacao: MateriaSemana["situacao"] =
      avaliadas === 0 ? "praticando"
      : m.praticando >= 2 && m.praticando > m.domina ? "atencao"
      : m.domina + m.quase >= m.praticando ? "indo_bem"
      : "praticando";
    return { ...m, situacao };
  }).sort((a, b) => Number(b.situacao === "atencao") - Number(a.situacao === "atencao") || b.atividades - a.atividades);

  const total = {
    atividades: dias.reduce((s, d) => s + d.atividades, 0),
    minutos: dias.reduce((s, d) => s + d.minutos, 0),
    diasEstudados: dias.filter((d) => d.atividades > 0).length,
  };

  // Tendência: os 3 últimos dias contra os 4 anteriores (média por dia)
  const antes = dias.slice(0, 4).reduce((s, d) => s + d.atividades, 0) / 4;
  const depois = dias.slice(4).reduce((s, d) => s + d.atividades, 0) / 3;
  const tendencia: Semana["tendencia"] =
    total.atividades === 0 ? "sem_dados"
    : antes > 0 && depois < antes * 0.5 ? "caindo"
    : depois > antes * 1.5 && depois >= 1 ? "subindo"
    : "estavel";

  const atencao = materias.filter((m) => m.situacao === "atencao").map((m) => nomeMateria(m.codigo));
  const bem = materias.filter((m) => m.situacao === "indo_bem").map((m) => nomeMateria(m.codigo));
  const lista = (xs: string[]) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`;

  let frase: string;
  if (total.atividades === 0) {
    frase = `${primeiroNome} ainda não estudou nos últimos 7 dias. Que tal combinar um horário na agenda?`;
  } else {
    const partes: string[] = [];
    partes.push(`${primeiroNome} estudou em ${total.diasEstudados} ${total.diasEstudados === 1 ? "dia" : "dias"} desta semana.`);
    if (bem.length) partes.push(`Está indo bem em ${lista(bem)}.`);
    if (atencao.length) partes.push(`${lista(atencao)} ${atencao.length === 1 ? "precisa" : "precisam"} de atenção: vale sentar junto e ajudar.`);
    if (tendencia === "caindo") partes.push("Nos últimos dias estudou menos que antes.");
    if (tendencia === "subindo") partes.push("Nos últimos dias estudou mais. Vale um elogio!");
    frase = partes.join(" ");
  }

  return { dias, materias, total, tendencia, frase };
}

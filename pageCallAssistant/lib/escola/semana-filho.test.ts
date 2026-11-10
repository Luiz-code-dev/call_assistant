import { describe, it, expect } from "vitest";
import { montarSemana, diaSaoPaulo } from "./semana-filho";
import { whatsappValido } from "./phone";
import { avisoSemEstudo, avisoAtencao, avisoConquista, emailDoAviso, horarioDeAvisar } from "./avisos-familia";

const nome = (c: string) => ({ MA: "Matemática", LP: "Língua Portuguesa" } as Record<string, string>)[c] ?? c;
const agora = new Date("2026-11-13T18:00:00Z"); // sexta, 15h em São Paulo
const dia = (n: number) => new Date(agora.getTime() - n * 86_400_000);

describe("Semana do filho", () => {
  it("tem 7 dias terminando hoje", () => {
    const s = montarSemana([], "Bia", nome, agora);
    expect(s.dias).toHaveLength(7);
    expect(s.dias[6].rotulo).toBe("Hoje");
    expect(s.dias[6].dia).toBe(diaSaoPaulo(agora));
    expect(s.tendencia).toBe("sem_dados");
    expect(s.frase).toMatch(/ainda não estudou/);
  });

  it("vai bem em Português, precisa de atenção em Matemática e estudou menos no fim", () => {
    const e = [
      ...[6, 5, 4, 3].flatMap((n) => [
        { quando: dia(n), materia: "LP", nivel: "MASTERED" as const, minutos: 10 },
        { quando: dia(n), materia: "LP", nivel: "ALMOST" as const, minutos: 10 },
      ]),
      { quando: dia(1), materia: "MA", nivel: "NOT_YET" as const, minutos: 10 },
      { quando: dia(0), materia: "MA", nivel: "NOT_YET" as const, minutos: 10 },
    ];
    const s = montarSemana(e, "Bia", nome, agora);
    expect(s.total.atividades).toBe(10);
    expect(s.total.diasEstudados).toBe(6);
    expect(s.materias[0]).toMatchObject({ codigo: "MA", situacao: "atencao" });
    expect(s.materias.find((m) => m.codigo === "LP")?.situacao).toBe("indo_bem");
    expect(s.tendencia).toBe("caindo");
    expect(s.frase).toMatch(/Língua Portuguesa/);
    expect(s.frase).toMatch(/Matemática precisa de atenção/);
    expect(s.frase).not.toMatch(/\d+(,\d+)?\s*(pontos|nota)/i);
  });
});

describe("WhatsApp do responsável", () => {
  it("aceita celular com DDD, com ou sem 55", () => {
    expect(whatsappValido("(71) 98765-4321")).toBe("71987654321");
    expect(whatsappValido("+55 71 98765-4321")).toBe("71987654321");
  });
  it("recusa fixo e número curto", () => {
    expect(whatsappValido("(71) 3333-4444")).toBeNull();
    expect(whatsappValido("98765")).toBeNull();
  });
});

describe("Avisos para a família", () => {
  it("cada tipo tem título, ícone e grupo próprios e abre o painel do filho", () => {
    const a = avisoSemEstudo("Bia Demo", 1, "s1");
    const b = avisoAtencao("Bia Demo", "MA", "Frações", "s1", true);
    const c = avisoConquista("Bia Demo", "LP", "Pontuação", "s1");
    expect(a.title).toBe("Bia não estuda desde ontem");
    expect(avisoSemEstudo("Bia", 3, "s1").title).toBe("Bia está há 3 dias sem estudar");
    expect(b.title).toMatch(/Bia precisa de ajuda em Matem/);
    expect(c.title).toBe("Bia terminou uma trilha!");
    expect(new Set([a.icon, b.icon, c.icon]).size).toBe(3);
    expect(new Set([a.tag, b.tag, c.tag]).size).toBe(3);
    for (const x of [a, b, c]) expect(x.url.startsWith("/escola/familia/s1")).toBe(true);
  });
  it("e-mail escapa o texto e tem link do painel", () => {
    const m = emailDoAviso("Ana <x>", avisoConquista("Bia", null, "<b>T</b>", "s1"), "https://speakflow.ia.br");
    expect(m.html).not.toMatch(/<b>T<\/b>/);
    expect(m.html).toMatch(/https:\/\/speakflow\.ia\.br\/escola\/familia\/s1/);
    expect(m.text).toMatch(/Abrir o painel/);
  });
  it("aviso de sem estudar só sai das 9h às 20h", () => {
    expect(horarioDeAvisar(new Date("2026-11-13T12:00:00Z"))).toBe(true);  // 9h
    expect(horarioDeAvisar(new Date("2026-11-13T23:30:00Z"))).toBe(false); // 20h30
    expect(horarioDeAvisar(new Date("2026-11-13T09:00:00Z"))).toBe(false); // 6h
  });
});

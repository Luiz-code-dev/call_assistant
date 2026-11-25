import { describe, it, expect } from "vitest";
import {
  ASSUNTOS_APOIO, ASSUNTO_PARA_O_ALUNO, ASSUNTO_PARA_A_EQUIPE, STATUS_APOIO, STATUS_PARA_A_EQUIPE,
  canalDisponivel, validarPedido, statusParaOAluno, audioAceito, emailNovoPedido, MAX_TEXTO_APOIO, MAX_AUDIO_BYTES,
  atendeAEscola, emailCienciaDaGestao, emailCasoRecebido, orgaosValidos, desfechoValido, funcaoValida, ORIENTACAO, indicadores, type PedidoParaContar,
} from "./apoio-aluno";

describe("canal de apoio: quando aparece", () => {
  it("só aparece com a rede ligada e a partir do ano mínimo", () => {
    expect(canalDisponivel({ apoioAtivo: true, apoioAnoMinimo: 7 }, 7)).toBe(true);
    expect(canalDisponivel({ apoioAtivo: true, apoioAnoMinimo: 7 }, 6)).toBe(false);
    expect(canalDisponivel({ apoioAtivo: true, apoioAnoMinimo: 6 }, 6)).toBe(true);
    expect(canalDisponivel({ apoioAtivo: false, apoioAnoMinimo: 6 }, 9)).toBe(false);
    expect(canalDisponivel(null, 9)).toBe(false);
    expect(canalDisponivel({ apoioAtivo: true, apoioAnoMinimo: 6 }, null)).toBe(false);
  });
});

describe("canal de apoio: pedido do aluno", () => {
  it("aceita só o assunto, sem obrigar o aluno a escrever", () => {
    expect(validarPedido({ assunto: "CONVERSAR" })).toEqual({ assunto: "CONVERSAR", text: null });
    expect(validarPedido({ assunto: "CASA", text: "  quero falar  " })).toEqual({ assunto: "CASA", text: "quero falar" });
  });
  it("recusa assunto desconhecido e texto grande demais", () => {
    expect(validarPedido({ assunto: "X" })).toHaveProperty("erro");
    expect(validarPedido({})).toHaveProperty("erro");
    expect(validarPedido({ assunto: "OUTRO", text: "a".repeat(MAX_TEXTO_APOIO + 1) })).toHaveProperty("erro");
  });
  it("aceita só áudio do gravador, dentro do tamanho", () => {
    expect(audioAceito("audio/webm;codecs=opus", 1000)).toBe(true);
    expect(audioAceito("audio/mp4", MAX_AUDIO_BYTES)).toBe(true);
    expect(audioAceito("audio/webm", MAX_AUDIO_BYTES + 1)).toBe(false);
    expect(audioAceito("video/mp4", 1000)).toBe(false);
    expect(audioAceito("audio/webm", 0)).toBe(false);
  });
});

describe("canal de apoio: palavras", () => {
  it("todo assunto e toda situação têm texto", () => {
    for (const a of ASSUNTOS_APOIO) { expect(ASSUNTO_PARA_O_ALUNO[a]).toBeTruthy(); expect(ASSUNTO_PARA_A_EQUIPE[a]).toBeTruthy(); }
    for (const s of STATUS_APOIO) { expect(STATUS_PARA_A_EQUIPE[s]).toBeTruthy(); expect(statusParaOAluno(s)).toBeTruthy(); }
  });
  it("as opções do aluno não usam palavras que acusam ou assustam", () => {
    const proibidas = /abuso|den[uú]ncia|viol[eê]ncia|psic[oó]log|crime|pol[ií]cia|agress/i;
    for (const a of ASSUNTOS_APOIO) expect(ASSUNTO_PARA_O_ALUNO[a]).not.toMatch(proibidas);
  });
  it("o aluno nunca vê a situação interna da equipe", () => {
    expect(statusParaOAluno("ENCAMINHADO")).toBe(statusParaOAluno("EM_ACOMPANHAMENTO"));
    expect(statusParaOAluno("ENCAMINHADO")).not.toMatch(/encaminh|conselho|prote/i);
  });
  it("o e-mail para a equipe não leva assunto nem conteúdo", () => {
    const e = emailNovoPedido("https://exemplo.test");
    expect(e.text).toContain("https://exemplo.test/escola/apoio");
    for (const a of ASSUNTOS_APOIO) { expect(e.text).not.toContain(ASSUNTO_PARA_A_EQUIPE[a]); expect(e.subject).not.toContain(ASSUNTO_PARA_A_EQUIPE[a]); }
  });
});

describe("equipe de apoio: escolas atendidas", () => {
  it("lista vazia atende a rede toda; lista preenchida só as escolas dela", () => {
    expect(atendeAEscola([], "e1")).toBe(true);
    expect(atendeAEscola(null, null)).toBe(true);
    expect(atendeAEscola(["e1"], "e1")).toBe(true);
    expect(atendeAEscola(["e1"], "e2")).toBe(false);
    expect(atendeAEscola(["e1"], null)).toBe(false);
  });
  it("valida função, desfecho e órgãos", () => {
    expect(funcaoValida("PSICOLOGO")).toBe(true);
    expect(funcaoValida("MEDICO")).toBe(false);
    expect(desfechoValido("NAO_PROCEDE")).toBe(true);
    expect(desfechoValido("TROTE")).toBe(false);
    expect(orgaosValidos(["CONSELHO_TUTELAR", "CONSELHO_TUTELAR", "SAUDE"])).toEqual(["CONSELHO_TUTELAR", "SAUDE"]);
    expect(orgaosValidos(["OUTRO"])).toBeNull();
    expect(orgaosValidos("x")).toBeNull();
  });
  it("todo assunto tem orientação para a equipe", () => {
    for (const a of ASSUNTOS_APOIO) { expect(ORIENTACAO[a].titulo).toBeTruthy(); expect(ORIENTACAO[a].passos.length).toBeGreaterThanOrEqual(3); }
  });
});

describe("indicadores do apoio", () => {
  const agora = new Date("2026-11-25T15:00:00-03:00");
  const p = (x: Partial<PedidoParaContar>): PedidoParaContar => ({
    assunto: "CONVERSAR", status: "RECEBIDO", desfecho: null, comunicadoA: [], createdAt: agora, vistoAt: null, concluidoEm: null, ...x,
  });
  const lista = [
    p({}),
    p({ assunto: "CASA", status: "ENCAMINHADO", comunicadoA: ["CONSELHO_TUTELAR"], createdAt: new Date("2026-11-24T10:00:00-03:00"), vistoAt: new Date("2026-11-24T12:00:00-03:00") }),
    p({ status: "CONCLUIDO", desfecho: "NAO_PROCEDE", createdAt: new Date("2026-10-05T10:00:00-03:00"), vistoAt: new Date("2026-10-05T14:00:00-03:00"), concluidoEm: new Date("2026-10-06T10:00:00-03:00") }),
    p({ status: "CONCLUIDO", desfecho: null, createdAt: new Date("2025-03-01T10:00:00-03:00"), concluidoEm: new Date("2025-03-03T10:00:00-03:00") }),
  ];
  const r = indicadores(lista, agora);
  it("conta por situação, assunto, desfecho e órgão", () => {
    expect(r.total).toBe(4);
    expect(r.porStatus).toMatchObject({ RECEBIDO: 1, ENCAMINHADO: 1, CONCLUIDO: 2, EM_ACOMPANHAMENTO: 0 });
    expect(r.porAssunto).toMatchObject({ CONVERSAR: 3, CASA: 1 });
    expect(r.porDesfecho).toEqual({ ATENDIDO: 1, NAO_PROCEDE: 1 });
    expect(r.comunicados).toBe(1);
    expect(r.porOrgao.CONSELHO_TUTELAR).toBe(1);
  });
  it("monta as séries por dia, semana, mês e ano no calendário de Brasília", () => {
    expect(r.porDia).toHaveLength(14);
    expect(r.porDia[13]).toEqual({ periodo: "2026-11-25", total: 1 });
    expect(r.porDia[12]).toEqual({ periodo: "2026-11-24", total: 1 });
    expect(r.porSemana[r.porSemana.length - 1]).toEqual({ periodo: "2026-11-23", total: 2 });
    expect(r.porMes).toHaveLength(12);
    expect(r.porMes[11]).toEqual({ periodo: "2026-11", total: 2 });
    expect(r.porMes[10]).toEqual({ periodo: "2026-10", total: 1 });
    expect(r.porAno).toEqual([{ periodo: "2025", total: 1 }, { periodo: "2026", total: 3 }]);
  });
  it("calcula os tempos médios em horas", () => {
    expect(r.horasAteLeitura).toBe(3);
    expect(r.horasAteConclusao).toBe(36);
  });
  it("lista vazia não quebra", () => {
    const v = indicadores([], agora);
    expect(v.total).toBe(0);
    expect(v.horasAteLeitura).toBeNull();
    expect(v.porAno).toEqual([{ periodo: "2026", total: 0 }]);
  });
});

describe("avisos por e-mail do apoio", () => {
  it("a gestão é só avisada: sem conteúdo e sem link para os pedidos", () => {
    const e = emailCienciaDaGestao("https://exemplo.test");
    expect(e.text).toContain("https://exemplo.test/escola/rede/apoio");
    expect(e.text).not.toContain("/escola/apoio\n");
    for (const a of ASSUNTOS_APOIO) expect(e.text).not.toContain(ASSUNTO_PARA_A_EQUIPE[a]);
  });
  it("quem recebe um caso é avisado sem nome e sem conteúdo", () => {
    const e = emailCasoRecebido("https://exemplo.test");
    expect(e.text).toContain("https://exemplo.test/escola/apoio");
    for (const a of ASSUNTOS_APOIO) expect(e.text).not.toContain(ASSUNTO_PARA_A_EQUIPE[a]);
  });
});

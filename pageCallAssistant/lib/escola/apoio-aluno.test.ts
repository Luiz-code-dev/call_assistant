import { describe, it, expect } from "vitest";
import {
  ASSUNTOS_APOIO, ASSUNTO_PARA_O_ALUNO, ASSUNTO_PARA_A_EQUIPE, STATUS_APOIO, STATUS_PARA_A_EQUIPE,
  canalDisponivel, validarPedido, statusParaOAluno, audioAceito, emailNovoPedido, MAX_TEXTO_APOIO, MAX_AUDIO_BYTES,
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

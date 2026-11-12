import { describe, it, expect } from "vitest";
import { ehPedidoDeAjuda } from "./pedido-ajuda";

describe("ehPedidoDeAjuda", () => {
  it("reconhece pedidos de ajuda", () => {
    for (const t of ["Não entendi a pergunta", "Me dá uma pista", "não sei", "Como eu começo?", "O que significa dezena", "tá difícil", "quanto é?"]) expect(ehPedidoDeAjuda(t), t).toBe(true);
  });
  it("não conta respostas do aluno", () => {
    for (const t of ["Deu 50", "Contar de 10 em 10", "O 7", "50 laranjas"]) expect(ehPedidoDeAjuda(t), t).toBe(false);
  });
});

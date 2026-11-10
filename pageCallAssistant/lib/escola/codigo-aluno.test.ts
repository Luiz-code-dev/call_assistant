import { describe, it, expect } from "vitest";
import { gerarCodigo, codigoValido, formatarCodigo, normalizarCodigo, ALFABETO_CODIGO } from "./codigo-aluno";

describe("código do aluno", () => {
  it("gera 8 caracteres sem I, O, 0 e 1", () => {
    for (let i = 0; i < 200; i++) {
      const c = gerarCodigo();
      expect(c).toHaveLength(8);
      expect(c).not.toMatch(/[IO01]/);
      expect(codigoValido(c)).toBe(true);
    }
    expect(ALFABETO_CODIGO).toHaveLength(32);
  });
  it("aceita com traço, espaço e minúsculas", () => {
    expect(normalizarCodigo(" refb-6anb ")).toBe("REFB6ANB");
    expect(codigoValido("refb-6anb")).toBe(true);
    expect(formatarCodigo("REFB6ANB")).toBe("REFB-6ANB");
  });
  it("recusa tamanho errado e letras confusas", () => {
    expect(codigoValido("DEMB55")).toBe(false);
    expect(codigoValido("REFB6AN0")).toBe(false);
    expect(codigoValido("")).toBe(false);
  });
});

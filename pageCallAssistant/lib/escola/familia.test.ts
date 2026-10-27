import { describe, it, expect } from "vitest";
import {
  genFamilyCode, normalizeFamilyCode, hashFamilyCode, sameBirthDate,
  isGuardianRelation, FAMILY_CODE_ALPHABET, FAMILY_CODE_LENGTH, MAX_GUARDIANS_PER_STUDENT,
} from "./familia";

describe("genFamilyCode", () => {
  it("tem 8 caracteres do alfabeto sem ambiguos", () => {
    for (let i = 0; i < 50; i++) {
      const c = genFamilyCode();
      expect(c).toHaveLength(FAMILY_CODE_LENGTH);
      for (const ch of c) expect(FAMILY_CODE_ALPHABET).toContain(ch);
    }
  });
  it("nao contem caracteres ambiguos (0,O,1,I)", () => {
    for (let i = 0; i < 50; i++) expect(genFamilyCode()).not.toMatch(/[01OI]/);
  });
});

describe("normalizeFamilyCode", () => {
  it("remove espacos/hifens e deixa maiusculo", () => {
    expect(normalizeFamilyCode("ab cd-ef23")).toBe("ABCDEF23");
  });
});

describe("hashFamilyCode", () => {
  it("e deterministico e normaliza antes", () => {
    expect(hashFamilyCode("abcd2345")).toBe(hashFamilyCode("ABCD2345"));
    expect(hashFamilyCode("ab cd-2345")).toBe(hashFamilyCode("ABCD2345"));
  });
  it("difere para codigos diferentes e tem 64 hex", () => {
    expect(hashFamilyCode("AAAA2345")).not.toBe(hashFamilyCode("BBBB2345"));
    expect(hashFamilyCode("AAAA2345")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("sameBirthDate", () => {
  it("compara so ano/mes/dia", () => {
    expect(sameBirthDate("2014-05-10", new Date("2014-05-10T00:00:00.000Z"))).toBe(true);
    expect(sameBirthDate("2014-05-10", new Date("2014-05-10T23:30:00.000Z"))).toBe(true);
    expect(sameBirthDate("2014-05-10", "2014-05-11")).toBe(false);
  });
  it("datas nulas nunca batem", () => {
    expect(sameBirthDate(null, "2014-05-10")).toBe(false);
    expect(sameBirthDate("2014-05-10", null)).toBe(false);
    expect(sameBirthDate(null, null)).toBe(false);
  });
});

describe("isGuardianRelation", () => {
  it("aceita validos e rejeita invalidos", () => {
    expect(isGuardianRelation("MAE")).toBe(true);
    expect(isGuardianRelation("PAI")).toBe(true);
    expect(isGuardianRelation("AMIGO")).toBe(false);
    expect(isGuardianRelation(null)).toBe(false);
  });
});

describe("regras", () => {
  it("maximo de 4 responsaveis por aluno", () => {
    expect(MAX_GUARDIANS_PER_STUDENT).toBe(4);
  });
});

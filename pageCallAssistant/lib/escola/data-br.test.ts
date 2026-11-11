import { describe, it, expect } from "vitest";
import { mascaraData, dataIso } from "./data-br";

describe("data-br", () => {
  it("põe as barras enquanto digita", () => {
    expect(mascaraData("1")).toBe("1");
    expect(mascaraData("1203")).toBe("12/03");
    expect(mascaraData("12032015")).toBe("12/03/2015");
    expect(mascaraData("12/03/2015999")).toBe("12/03/2015");
  });
  it("converte para ISO e recusa datas que não existem", () => {
    expect(dataIso("12/03/2015")).toBe("2015-03-12");
    expect(dataIso("31/02/2015")).toBe("");
    expect(dataIso("12/13/2015")).toBe("");
    expect(dataIso("12/03/15")).toBe("");
    expect(dataIso("01/01/1980")).toBe("");
  });
});

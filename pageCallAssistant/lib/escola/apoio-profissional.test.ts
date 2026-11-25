import { describe, it, expect } from "vitest";
import {
  validarCadastro, registroValido, registroLimpo, registroFormatado, nomesBatem, interpretarConsulta,
  emailConviteProfissional, emailRecusaAoGestor, TERMO_ITENS, TERMO_VERSAO, CONSELHO,
} from "./apoio-profissional";

const base = { nome: "Maria Souza Lima", email: "Maria@Exemplo.com", funcao: "PSICOLOGO", registro: " 03/12345 ", uf: "ba", declaro: true };

describe("cadastro do profissional de apoio", () => {
  it("aceita o cadastro completo e normaliza os campos", () => {
    expect(validarCadastro(base)).toEqual({ nome: "Maria Souza Lima", email: "maria@exemplo.com", funcao: "PSICOLOGO", registro: "03/12345", uf: "BA", schoolIds: [] });
  });
  it("sem a declaração de veracidade não cadastra", () => {
    expect(validarCadastro({ ...base, declaro: false })).toHaveProperty("erro");
    expect(validarCadastro({ ...base, declaro: "sim" })).toHaveProperty("erro");
  });
  it("recusa nome incompleto, e-mail, função, registro e UF inválidos", () => {
    expect(validarCadastro({ ...base, nome: "Maria" })).toHaveProperty("erro");
    expect(validarCadastro({ ...base, email: "maria" })).toHaveProperty("erro");
    expect(validarCadastro({ ...base, funcao: "INDICADO" })).toHaveProperty("erro");
    expect(validarCadastro({ ...base, registro: "abc" })).toHaveProperty("erro");
    expect(validarCadastro({ ...base, uf: "XX" })).toHaveProperty("erro");
  });
  it("valida o formato do registro", () => {
    expect(registroValido("03/12345")).toBe(true);
    expect(registroValido("12345")).toBe(true);
    expect(registroValido("5.123-4")).toBe(true);
    expect(registroValido("12")).toBe(false);
    expect(registroValido("/12345")).toBe(false);
    expect(registroValido("12345678901234567")).toBe(false);
    expect(registroLimpo(" 03 / 123 ")).toBe("03/123");
    expect(registroFormatado("CRP", "03/12345", "BA")).toBe("CRP 03/12345/BA");
  });
  it("guarda as escolas sem repetir", () => {
    expect(validarCadastro({ ...base, schoolIds: ["e1", "e1", "e2", 3] })).toMatchObject({ schoolIds: ["e1", "e2"] });
  });
});

describe("consulta ao conselho", () => {
  it("compara primeiro e último nome, sem acento", () => {
    expect(nomesBatem("Maria Souza Lima", "MARIA S. LIMA")).toBe(true);
    expect(nomesBatem("José Antônio da Conceição", "JOSE ANTONIO DA CONCEICAO")).toBe(true);
    expect(nomesBatem("Maria Souza Lima", "Maria Souza")).toBe(false);
    expect(nomesBatem("Maria", "Maria Lima")).toBe(false);
  });
  const resp = (resultados: unknown[]) => ({ code: 200, data: [{ resultados }] });
  it("confirma só quando a pessoa aparece com situação ativa", () => {
    expect(interpretarConsulta(resp([{ nome: "MARIA SOUZA LIMA", situacao: "Ativo" }]), "Maria Souza Lima")).toEqual({ resultado: "ATIVO", situacao: "Ativo" });
    expect(interpretarConsulta(resp([{ nome: "MARIA SOUZA LIMA", situacao: "Cancelado" }]), "Maria Souza Lima")).toEqual({ resultado: "INATIVO", situacao: "Cancelado" });
    expect(interpretarConsulta(resp([{ nome: "OUTRA PESSOA SILVA", situacao: "Ativo" }]), "Maria Souza Lima").resultado).toBe("NAO_ENCONTRADO");
    expect(interpretarConsulta(resp([]), "Maria Souza Lima").resultado).toBe("NAO_ENCONTRADO");
    expect(interpretarConsulta({ code: 612 }, "Maria Souza Lima").resultado).toBe("NAO_ENCONTRADO");
  });
  it("resposta inesperada é falha, nunca confirmação", () => {
    expect(interpretarConsulta(null, "Maria Souza Lima").resultado).toBe("FALHA");
    expect(interpretarConsulta({ code: 600 }, "Maria Souza Lima").resultado).toBe("FALHA");
    expect(interpretarConsulta({ data: [] }, "Maria Souza Lima").resultado).toBe("FALHA");
    expect(interpretarConsulta("erro", "Maria Souza Lima").resultado).toBe("FALHA");
  });
});

describe("termo e e-mails do profissional", () => {
  it("o termo tem versão e trata de sigilo, registro das ações, direitos e exclusão", () => {
    expect(TERMO_VERSAO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const tudo = TERMO_ITENS.map((i) => `${i.titulo} ${i.texto}`).join(" ");
    for (const palavra of ["Sigilo", "registrados", "LGPD", "exclusão", "Conselho Tutelar"]) expect(tudo).toContain(palavra);
  });
  it("o convite diz onde, por quê, quais dados e como recusar", () => {
    const e = emailConviteProfissional({ nome: "Maria Souza Lima", rede: "Rede Demo", funcao: "PSICOLOGO", registro: "03/12345", uf: "BA", atende: "Toda a rede", cadastradoPor: "Gestor Demo", link: "https://exemplo.test/escola/convite/abc" });
    expect(e.subject).toContain("Rede Demo");
    for (const t of ["Rede Demo", `${CONSELHO.PSICOLOGO.sigla} 03/12345/BA`, "Toda a rede", "Gestor Demo", "https://exemplo.test/escola/convite/abc", "Recusar e pedir a exclusão"]) expect(e.text).toContain(t);
  });
  it("a recusa avisa o gestor sem repetir o registro", () => {
    const e = emailRecusaAoGestor("Maria Souza Lima", "https://exemplo.test");
    expect(e.text).toContain("https://exemplo.test/escola/rede/apoio");
    expect(e.text).not.toMatch(/CRP|CRESS|\d{4}/);
  });
});

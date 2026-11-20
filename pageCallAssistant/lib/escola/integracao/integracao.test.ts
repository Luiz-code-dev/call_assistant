import { describe, it, expect, beforeEach } from "vitest";
import { chaveDoCabecalho, gerarChave, hashDaChave, ipPermitido, redeDaChave, validarListaDeIps } from "./chave";
import { chaveDeCampo, limparDePara, paraLinha } from "./mapa";
import { ipReservado, motivoUrlInvalida } from "./destino";
import { assinar, cifrar, decifrar, gerarSegredo } from "./cripto";
import { contar, excedeu, ipDoCliente, zerarLimites } from "./limite";

describe("chave de integração", () => {
  it("gera uma chave que carrega a rede e bate com o hash", () => {
    const { chave, hash, prefixo } = gerarChave("demo-rede-b");
    expect(chave.startsWith("sfe_")).toBe(true);
    expect(redeDaChave(chave)).toBe("demo-rede-b");
    expect(hashDaChave(chave)).toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // o trecho visível não revela a chave
    expect(prefixo.length).toBeLessThan(20);
    expect(chave.includes(prefixo)).toBe(false);
  });

  it("duas chaves da mesma rede são diferentes", () => {
    expect(gerarChave("r1").chave).not.toBe(gerarChave("r1").chave);
  });

  it("recusa o que não é chave nossa", () => {
    expect(redeDaChave("qualquer-coisa")).toBeNull();
    expect(redeDaChave("sfe_x_curta")).toBeNull();
    expect(redeDaChave(`sfe_${Buffer.from("../../etc").toString("base64url")}.${"a".repeat(43)}`)).toBeNull();
    // rede cujo id tem sublinhado e traço continua legível
    expect(redeDaChave(gerarChave("rede_municipal-01").chave)).toBe("rede_municipal-01");
  });

  it("lê a chave do cabeçalho Authorization ou X-Api-Key", () => {
    const { chave } = gerarChave("r1");
    expect(chaveDoCabecalho(`Bearer ${chave}`, null)).toBe(chave);
    expect(chaveDoCabecalho(null, chave)).toBe(chave);
    expect(chaveDoCabecalho("Bearer token-de-outra-coisa", null)).toBeNull();
    expect(chaveDoCabecalho(null, null)).toBeNull();
  });
});

describe("lista de IPs permitidos", () => {
  it("lista vazia libera qualquer endereço", () => {
    expect(ipPermitido("8.8.8.8", [])).toBe(true);
    expect(ipPermitido(null, null)).toBe(true);
  });
  it("aceita IP exato e faixa CIDR, e recusa o resto", () => {
    expect(ipPermitido("200.10.20.30", ["200.10.20.30"])).toBe(true);
    expect(ipPermitido("200.10.21.77", ["200.10.21.0/24"])).toBe(true);
    expect(ipPermitido("200.10.22.1", ["200.10.21.0/24"])).toBe(false);
    expect(ipPermitido("::ffff:200.10.20.30", ["200.10.20.30"])).toBe(true);
    expect(ipPermitido(null, ["200.10.20.30"])).toBe(false);
  });
  it("valida o que o gestor digitou", () => {
    expect(validarListaDeIps(["200.10.20.30", " 10.0.0.0/8 "])).toEqual({ ok: true, ips: ["200.10.20.30", "10.0.0.0/8"] });
    expect(validarListaDeIps(["999.1.1.1"])).toEqual({ ok: false, invalido: "999.1.1.1" });
    expect(validarListaDeIps(["meu-servidor"])).toEqual({ ok: false, invalido: "meu-servidor" });
  });
});

describe("de-para de campos", () => {
  it("compara nomes de campo sem acento, espaço ou sublinhado", () => {
    expect(chaveDeCampo("Matrícula do Aluno")).toBe("matriculadoaluno");
    expect(chaveDeCampo("codigo_inep")).toBe("codigoinep");
  });

  it("reconhece apelidos comuns e normaliza valores", () => {
    const linha = paraLinha("STUDENTS", { Nome: "Aluno Teste", Matricula: 2026001, Turma: "6º Ano B", INEP: "29000000", Série: "6º ano", Turno: "Vespertino", Segmento: "Anos Finais" });
    expect(linha).toEqual({
      nome_aluno: "Aluno Teste", matricula_aluno: "2026001", turma: "6º Ano B", codigo_inep: "29000000",
      ano_serie: "6", turno: "AFTERNOON", etapa: "ELEMENTARY_LATE",
    });
  });

  it("o de-para da chave vale antes dos apelidos, e campo desconhecido é descartado", () => {
    const dePara = limparDePara({ cod_estudante: "matricula_aluno", nm_estudante: "nome_aluno", lixo: "campo_que_nao_existe" });
    expect(dePara).toEqual({ codestudante: "matricula_aluno", nmestudante: "nome_aluno" });
    const linha = paraLinha("STUDENTS", { cod_estudante: "77", nm_estudante: "Aluno Teste", turma: "5A", cpf: "000.000.000-00", endereco: { rua: "x" } }, dePara);
    expect(linha).toEqual({ matricula_aluno: "77", nome_aluno: "Aluno Teste", turma: "5A" });
  });

  it("papel do servidor em vários formatos", () => {
    expect(paraLinha("STAFF", { nome: "Fulana", email: "Fulana@Rede.Gov.Br", cargo: "Professora" })).toEqual({ nome: "Fulana", email: "fulana@rede.gov.br", papel: "PROFESSOR" });
  });

  it("não quebra com entrada estranha", () => {
    expect(paraLinha("SCHOOLS", null)).toEqual({});
    expect(paraLinha("SCHOOLS", ["a"])).toEqual({});
    expect(limparDePara("texto")).toEqual({});
  });
});

describe("destino dos avisos (proteção contra chamada para rede interna)", () => {
  it("só aceita https público", () => {
    expect(motivoUrlInvalida("https://sistema.exemplo.gov.br/avisos")).toBeNull();
    expect(motivoUrlInvalida("http://sistema.exemplo.gov.br/avisos")).not.toBeNull();
    expect(motivoUrlInvalida("https://localhost/avisos")).not.toBeNull();
    expect(motivoUrlInvalida("https://10.0.0.5/avisos")).not.toBeNull();
    expect(motivoUrlInvalida("https://169.254.169.254/latest/meta-data")).not.toBeNull();
    expect(motivoUrlInvalida("https://usuario:senha@sistema.exemplo.gov.br/")).not.toBeNull();
    expect(motivoUrlInvalida("https://sistema.exemplo.gov.br:22/")).not.toBeNull();
    expect(motivoUrlInvalida("https://banco.internal/x")).not.toBeNull();
    expect(motivoUrlInvalida("nao é url")).not.toBeNull();
  });
  it("reconhece endereços reservados", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      expect(ipReservado(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "200.10.20.30", "2606:4700:4700::1111"]) {
      expect(ipReservado(ip), ip).toBe(false);
    }
  });
});

describe("segredo e assinatura dos avisos", () => {
  it("cifra e decifra, e cada cifra é diferente", () => {
    const s = gerarSegredo();
    const a = cifrar(s);
    const b = cifrar(s);
    expect(a).not.toBe(b);
    expect(a.includes(s)).toBe(false);
    expect(decifrar(a)).toBe(s);
    expect(decifrar(b)).toBe(s);
  });
  it("recusa segredo adulterado", () => {
    const partes = cifrar("segredo").split(".");
    partes[3] = Buffer.from("outra coisa").toString("base64url");
    expect(() => decifrar(partes.join("."))).toThrow();
  });
  it("a assinatura muda com o corpo, o instante e o segredo", () => {
    const base = assinar("s1", 1000, '{"a":1}');
    expect(base).toMatch(/^t=1000,v1=[0-9a-f]{64}$/);
    expect(assinar("s1", 1000, '{"a":2}')).not.toBe(base);
    expect(assinar("s1", 1001, '{"a":1}')).not.toBe(base);
    expect(assinar("s2", 1000, '{"a":1}')).not.toBe(base);
    expect(assinar("s1", 1000, '{"a":1}')).toBe(base);
  });
});

describe("limite de chamadas", () => {
  beforeEach(() => zerarLimites());
  it("libera até o limite e depois pede espera", () => {
    for (let i = 0; i < 3; i++) expect(contar("k", 3, 60_000, 1000)).toBe(0);
    expect(contar("k", 3, 60_000, 1000)).toBeGreaterThan(0);
    expect(excedeu("k", 3, 60_000, 1000)).toBeGreaterThan(0);
    // janela nova libera de novo
    expect(contar("k", 3, 60_000, 62_000)).toBe(0);
    expect(excedeu("outra", 3, 60_000, 1000)).toBe(0);
  });
  it("pega o IP escrito pelo proxy, não o que o cliente inventou", () => {
    expect(ipDoCliente("1.1.1.1, 200.10.20.30", 1)).toBe("200.10.20.30");
    expect(ipDoCliente("9.9.9.9, 200.10.20.30, 172.70.0.1", 2)).toBe("200.10.20.30");
    expect(ipDoCliente("200.10.20.30", 1)).toBe("200.10.20.30");
    expect(ipDoCliente(null)).toBeNull();
  });
});

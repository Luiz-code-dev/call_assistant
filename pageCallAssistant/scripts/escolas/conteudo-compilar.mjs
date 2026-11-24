#!/usr/bin/env node
/**
 * scripts/escolas/conteudo-compilar.mjs
 *
 * Compila os arquivos de autoria (prisma/data/conteudo/fonte/*.txt) nos arquivos do pacote
 * que o conteudo-pacote-import publica: trilhas, diagnósticos, fichas e pré-requisitos.
 * Gera as variantes de cada questão, a posição da alternativa certa e o roteiro de áudio.
 *
 * Uso: node scripts/escolas/conteudo-compilar.mjs   (depois: npm run escolas:conteudo-validar)
 *
 * Formato da fonte (uma instrução por linha; linhas vazias e iniciadas por // são ignoradas):
 *   #TRILHA código | matéria | ano | título | título para o aluno
 *   FAZ: o que o aluno faz                      (ficha pedagógica)
 *   ERRO: codigo-do-erro | descrição            (3 ou 4; os códigos valem para as alternativas)
 *   NOTA: orientação para a idade
 *   @relembrar | título | texto de abertura     (também @exemplo_guiado, @praticar, @aplicar)
 *   Q: pergunta
 *   + alternativa certa
 *   - alternativa errada | codigo-do-erro       (3)
 *   E: explicação para o aluno
 *   V: pergunta da variante
 *   + certa da variante
 *   - errada da variante                        (3; herdam os códigos de erro da questão)
 *   @explicar | título | pergunta aberta
 *   C: codigo | critério                        (3)
 *   BOA: exemplo de boa resposta
 *   #DIAG id | matéria | ano | título | descrição
 *   I: código da habilidade | NORMAL ou DEGRAU  (seguido de Q, +, -, E)
 *   #PRE habilidade > pré-requisito | peso
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "prisma", "data", "conteudo");
const FONTE = join(DATA, "fonte");
const NOTA = "conteúdo SpeakFlow, em revisão pela equipe pedagógica";
const MATERIAS = { LP: "Língua Portuguesa", MA: "Matemática", CI: "Ciências", HI: "História", GE: "Geografia", AR: "Arte", EF: "Educação Física", LI: "Língua Inglesa", ER: "Ensino Religioso" };
const ETAPAS = ["relembrar", "exemplo_guiado", "praticar", "aplicar", "explicar"];
const MINUTOS = { relembrar: 4, exemplo_guiado: 4, praticar: 5, aplicar: 4, explicar: 6 };
const LETRAS = "ABCD";

const partes = (s) => s.split("|").map((x) => x.trim());
function erro(arq, n, msg) { throw new Error(`${arq}:${n}: ${msg}`); }

/** Coloca a certa na posição pedida, mantendo a ordem das erradas */
function montar(certa, erradas, pos) {
  const ops = erradas.map((e) => ({ text: e.text, misconceptionCode: e.code }));
  ops.splice(pos, 0, { text: certa });
  return ops;
}
const audioDe = (n, q, ops) => `Pergunta ${n}. ${q} ${ops.map((o, i) => `${LETRAS[i]}: ${o.text}`).join("; ")}.`;

function parse(arq, texto) {
  const out = { trilhas: [], diags: [], pres: [] };
  let trilha = null, diag = null, etapa = null, q = null, alvo = null; // alvo: "q" ou "v"
  const linhas = texto.split("\n");
  const fecharQ = (n) => {
    if (!q) return;
    if (!q.certa || q.erradas.length !== 3) erro(arq, n, `questão "${q.q.slice(0, 40)}" precisa de 1 certa e 3 erradas`);
    if (q.v && (!q.v.certa || q.v.erradas.length !== 3)) erro(arq, n, `variante de "${q.q.slice(0, 40)}" precisa de 1 certa e 3 erradas`);
    q = null; alvo = null;
  };
  linhas.forEach((bruta, idx) => {
    const n = idx + 1; const l = bruta.trim();
    if (!l || l.startsWith("//")) return;
    if (l.startsWith("#TRILHA ")) {
      fecharQ(n); diag = null;
      const [skill, subj, ano, titulo, aluno] = partes(l.slice(8));
      if (!MATERIAS[subj]) erro(arq, n, `matéria desconhecida: ${subj}`);
      trilha = { skill, subj, ano: Number(ano), titulo, aluno, faz: "", erros: [], nota: "", etapas: [], explicar: null };
      out.trilhas.push(trilha); etapa = null; return;
    }
    if (l.startsWith("#DIAG ")) {
      fecharQ(n); trilha = null; etapa = null;
      const [id, subj, ano, titulo, descricao] = partes(l.slice(6));
      diag = { id, subj, ano: Number(ano), titulo, descricao, itens: [] }; out.diags.push(diag); return;
    }
    if (l.startsWith("#DIAGMAIS ")) {
      // Acrescenta itens a um diagnóstico que já existe em diagnosticos/<arquivo>.json
      fecharQ(n); trilha = null; etapa = null;
      const [arquivo, versao, descricao] = partes(l.slice(10));
      diag = { mais: true, arquivo, versao: Number(versao), descricao, itens: [] }; out.diags.push(diag); return;
    }
    if (l.startsWith("#PRE ")) {
      fecharQ(n);
      const [par, peso] = partes(l.slice(5)); const [a, b] = par.split(">").map((x) => x.trim());
      out.pres.push({ skillCode: a, prerequisiteCode: b, weight: Number(peso ?? 3), reviewNote: NOTA }); return;
    }
    const m = l.match(/^(FAZ|ERRO|NOTA|Q|E|V|C|BOA|I):\s*(.*)$/);
    if (m) {
      const [, k, v] = m;
      if (k === "FAZ") trilha.faz = v;
      else if (k === "ERRO") { const [code, description] = partes(v); trilha.erros.push({ code, description }); }
      else if (k === "NOTA") trilha.nota = v;
      else if (k === "I") { fecharQ(n); const [skill, papel] = partes(v); q = { skill, role: papel === "DEGRAU" ? "DEGRAU_BANK" : "NORMAL", q: "", certa: null, erradas: [], e: "" }; diag.itens.push(q); alvo = "q"; }
      else if (k === "Q") {
        if (diag && q && !q.q) { q.q = v; return; }
        fecharQ(n);
        if (!etapa || etapa.step === "explicar") erro(arq, n, "Q fora de uma etapa de quiz");
        q = { q: v, certa: null, erradas: [], e: "", v: null }; etapa.qs.push(q); alvo = "q";
      }
      else if (k === "E") {
        // A explicação é da questão e vem antes do V; depois dele, sobrescreveria a explicação
        if (alvo === "v") erro(arq, n, "E depois da variante: a explicação vem antes do V");
        if (q.e) erro(arq, n, "explicação repetida na mesma questão");
        q.e = v;
      }
      else if (k === "V") { q.v = { q: v, certa: null, erradas: [] }; alvo = "v"; }
      else if (k === "C") { const [code, description] = partes(v); trilha.explicar.criterios.push({ code, description }); }
      else if (k === "BOA") trilha.explicar.boa = v;
      return;
    }
    if (l.startsWith("@")) {
      fecharQ(n);
      const [step, titulo, prompt] = partes(l.slice(1));
      if (!ETAPAS.includes(step)) erro(arq, n, `etapa desconhecida: ${step}`);
      if (step === "explicar") { trilha.explicar = { titulo, prompt, criterios: [], boa: "" }; etapa = { step }; }
      else { etapa = { step, titulo, prompt, qs: [] }; trilha.etapas.push(etapa); }
      return;
    }
    if (l.startsWith("+ ") || l.startsWith("- ")) {
      const dest = alvo === "v" ? q.v : q;
      if (!dest) erro(arq, n, "alternativa sem questão");
      if (l[0] === "+") dest.certa = l.slice(2).trim();
      else { const [text, code] = partes(l.slice(2)); dest.erradas.push({ text, code }); }
      return;
    }
    erro(arq, n, `linha não reconhecida: ${l.slice(0, 60)}`);
  });
  fecharQ(linhas.length);
  return out;
}

function compilarTrilha(t, arq) {
  const codigos = new Set(t.erros.map((e) => e.code));
  if (t.etapas.map((e) => e.step).join() !== ETAPAS.slice(0, 4).join()) throw new Error(`${arq} ${t.skill}: etapas fora de ordem ou faltando`);
  if (!t.explicar || t.explicar.criterios.length < 2 || !t.explicar.boa) throw new Error(`${arq} ${t.skill}: etapa explicar incompleta`);
  if (!t.faz || t.erros.length < 3) throw new Error(`${arq} ${t.skill}: ficha incompleta (FAZ e 3 ERRO)`);
  let giro = t.skill.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const activities = t.etapas.map((e, ei) => {
    if (e.qs.length < 3) throw new Error(`${arq} ${t.skill} ${e.step}: menos de 3 questões`);
    const questions = e.qs.map((q) => {
      for (const x of q.erradas) if (!codigos.has(x.code)) throw new Error(`${arq} ${t.skill}: código de erro "${x.code}" não está na ficha ("${q.q.slice(0, 40)}")`);
      if (!q.e) throw new Error(`${arq} ${t.skill}: questão sem explicação ("${q.q.slice(0, 40)}")`);
      if (!q.v) throw new Error(`${arq} ${t.skill}: questão sem variante ("${q.q.slice(0, 40)}")`);
      const pos = giro++ % 4;
      const options = montar(q.certa, q.erradas, pos);
      const vErr = q.v.erradas.map((x, i) => ({ text: x.text, code: x.code ?? q.erradas[i].code }));
      const p1 = (pos + 2) % 4, p2 = (pos + 1) % 4;
      return {
        question: q.q, options, correctIndex: pos, explanation: q.e,
        variants: [
          { question: q.v.q, options: montar(q.v.certa, vErr, p1), correctIndex: p1 },
          { question: q.q, options: montar(q.certa, [...q.erradas].reverse(), p2), correctIndex: p2 },
        ],
      };
    });
    return {
      id: `PK2-${t.skill}-A${ei + 1}`, step: e.step, type: "QUIZ", title: e.titulo, prompt: e.prompt, estMinutes: MINUTOS[e.step],
      audioScript: `${e.prompt} ${questions.map((q, i) => audioDe(i + 1, q.question, q.options)).join(" ")}`,
      questions,
    };
  });
  activities.push({
    id: `PK2-${t.skill}-A5`, step: "explicar", type: "WRITTEN", allowSpoken: true, title: t.explicar.titulo, prompt: t.explicar.prompt, estMinutes: MINUTOS.explicar,
    audioScript: t.explicar.prompt,
    rubric: { type: "WRITTEN", criteria: t.explicar.criterios, exemploBoaResposta: t.explicar.boa },
  });
  return { skillCode: t.skill, subjectCode: t.subj, subjectName: MATERIAS[t.subj], gradeYear: t.ano, version: 1, title: t.titulo, tituloAluno: t.aluno, activities };
}

function compilarDiag(d, arq) {
  const cont = new Map(); let giro = d.id.length;
  const items = d.itens.map((it, i) => {
    if (!it.certa || it.erradas.length !== 3 || !it.e) throw new Error(`${arq} ${d.id}: item ${i + 1} incompleto`);
    for (const x of it.erradas) if (!x.code) throw new Error(`${arq} ${d.id}: alternativa errada sem código de erro (item ${i + 1})`);
    const k = (cont.get(it.skill) ?? 0) + 1; cont.set(it.skill, k);
    const pos = giro++ % 4; const options = montar(it.certa, it.erradas, pos);
    return {
      id: `DI2-${d.ano}A-${it.skill}-${String(k).padStart(2, "0")}`, skillCode: it.skill, question: it.q, options, correctIndex: pos, explanation: it.e,
      audioScript: audioDe(i + 1, it.q, options), role: it.role,
    };
  });
  return { id: d.id, version: 1, titulo: d.titulo, descricao: d.descricao, subjectCode: d.subj, subjectName: MATERIAS[d.subj], gradeYear: d.ano, status: "APPROVED", source: "SPEAKFLOW", reviewNote: NOTA, adaptive: true, items };
}

function main() {
  if (!existsSync(FONTE)) { console.log("Sem pasta fonte; nada a compilar."); return; }
  const trilhasPor = new Map(), fichasPor = new Map(), presPor = new Map(); const diags = []; const diagsMais = [];
  const vistos = new Set();
  for (const arq of readdirSync(FONTE).filter((f) => f.endsWith(".txt")).sort()) {
    const p = parse(arq, readFileSync(join(FONTE, arq), "utf8"));
    for (const t of p.trilhas) {
      if (vistos.has(t.skill)) throw new Error(`${arq}: trilha repetida para ${t.skill}`);
      vistos.add(t.skill);
      const chave = `${t.subj}-${String(t.ano).padStart(2, "0")}`;
      if (!trilhasPor.has(chave)) trilhasPor.set(chave, []);
      trilhasPor.get(chave).push(compilarTrilha(t, arq));
      if (!fichasPor.has(t.ano)) fichasPor.set(t.ano, []);
      fichasPor.get(t.ano).push({ skillCode: t.skill, subjectCode: t.subj, version: 1, whatStudentDoes: t.faz, commonErrors: t.erros, recommendedTypes: ["QUIZ", "WRITTEN", "SPOKEN"], ageNotes: t.nota, source: "SPEAKFLOW", status: "APPROVED", reviewNote: NOTA });
    }
    for (const d of p.diags) {
      if (!d.mais) { diags.push(compilarDiag(d, arq)); continue; }
      // Diagnóstico existente: tira o que este compilador acrescentou antes e põe de novo
      const caminho = join(DATA, "diagnosticos", `${d.arquivo}.json`);
      if (!existsSync(caminho)) throw new Error(`${arq}: diagnóstico ${d.arquivo}.json não existe`);
      const base = JSON.parse(readFileSync(caminho, "utf8"));
      const prefixo = `DI2-${base.gradeYear}A-`;
      const antigos = base.items.filter((it) => !String(it.id).startsWith(prefixo));
      const novos = compilarDiag({ ...d, id: base.id, ano: base.gradeYear, subj: base.subjectCode, titulo: base.titulo }, arq).items;
      const degrau = (it) => it.role === "DEGRAU_BANK";
      base.items = [...antigos.filter((it) => !degrau(it)), ...novos.filter((it) => !degrau(it)), ...antigos.filter(degrau), ...novos.filter(degrau)];
      base.version = d.versao;
      if (d.descricao) base.descricao = d.descricao;
      diagsMais.push({ caminho, dados: base });
    }
    const ano = Number((arq.match(/ano(\d)/) ?? [])[1] ?? 0);
    if (p.pres.length) { if (!presPor.has(ano)) presPor.set(ano, []); presPor.get(ano).push(...p.pres); }
  }
  const gravar = (caminho, dados) => { mkdirSync(dirname(caminho), { recursive: true }); writeFileSync(caminho, JSON.stringify(dados, null, 1) + "\n"); };
  for (const [chave, lista] of trilhasPor) {
    // Arquivo que já tem trilhas de outras habilidades (5º e 6º ano): mantém as que não vêm da fonte
    const caminho = join(DATA, "trilhas", `${chave}.json`);
    const codigos = new Set(lista.map((t) => t.skillCode));
    const mantidas = existsSync(caminho) ? JSON.parse(readFileSync(caminho, "utf8")).filter((t) => !codigos.has(t.skillCode)) : [];
    gravar(caminho, [...mantidas, ...lista]);
  }
  for (const d of diagsMais) gravar(d.caminho, d.dados);
  for (const d of diags) gravar(join(DATA, "diagnosticos", `DIAG-${d.subjectCode}-${d.gradeYear}A.json`), d);
  for (const [ano, lista] of fichasPor) gravar(join(DATA, "fichas", `fichas-pacote-ano${ano}.json`), lista);
  for (const [ano, lista] of presPor) gravar(join(DATA, `prerequisitos-pacote-ano${ano}.json`), { criar: lista, rejeitar: [] });
  const nq = [...trilhasPor.values()].flat().reduce((n, t) => n + t.activities.reduce((m, a) => m + (a.questions?.length ?? 0), 0), 0);
  console.log(`Compilado: ${[...trilhasPor.values()].flat().length} trilhas (${nq} questões, ${nq * 2} variantes), ${diags.length} diagnósticos, ${[...presPor.values()].flat().length} pré-requisitos.`);
}

main();

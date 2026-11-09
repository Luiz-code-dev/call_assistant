/**
 * Gerador do pacote de demonstracao P0.14
 * Gera: FRAC.json (8 trilhas fracoes), LP-05.json (4 trilhas leitura),
 *       DIAG-FRAC-6A-INICIO.json, DIAG-FRAC-6A-ACOMP.json,
 *       DIAG-FRAC-5A.json, DIAG-LP-5A.json
 * Uso: node scripts/escolas/gerar-conteudo-demo.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// --- imports das partes ---
import { tEF06MA07, tEF06MA08, tEF06MA09, tEF06MA10 } from './gerar-trilhas-frac-parte2.mjs';
import { tEF15LP03, tEF35LP03, tEF35LP04, tEF35LP05, LP_TEXTOS } from './gerar-trilhas-lp.mjs';

// --- trilhas do gerador parte1 (inline porque nao exportam) ---
// Importamos o modulo completo via dynamic no final. Para nao duplicar,
// copiamos apenas as referencias necessarias.
// A parte1 escreveu tEF04MA09, tEF05MA03, tEF05MA04, tEF05MA05 inline.
// Re-exportaremos via re-require do modulo.

const D = join(dirname(fileURLToPath(import.meta.url)), '../../prisma/data/conteudo/trilhas');
mkdirSync(D, { recursive: true });

// ===== helpers =====
const o = (t, mc) => mc ? {text:t, misconceptionCode:mc} : {text:t};
const vv = (q, opts, ci) => ({question:q, options:opts, correctIndex:ci});
const Q = (q, opts, ci, exp, vars, chk) => { const r={question:q,options:opts,correctIndex:ci,explanation:exp,variants:vars}; if(chk)r.check=chk; return r; };
const A = (id, step, type, title, prompt, est, audio, qs, rubric) => { const r={id,step,type,title,prompt,estMinutes:est,audioScript:audio}; if(qs)r.questions=qs; if(rubric)r.rubric=rubric; return r; };

// ===== EF04MA09 (inlined from parte1) =====
const tEF04MA09 = {
  skillCode:'EF04MA09',
  title:'Trilha: Fracoes unitarias usuais (EF04MA09)',
  activities:[
    A('PK-EF04MA09-A1','relembrar','QUIZ','Relembrar: o que e uma fracao','Uma fracao mostra partes iguais de um todo.',4,'Uma fracao mostra partes iguais de um todo.',[
      Q('Uma pizza foi cortada em 4 partes iguais. Joao comeu 1 pedaco. Que fracao ele comeu?',[o('1/4'),o('4/1','confunde-num-den'),o('1/3','todo-nao-e-inteiro'),o('2/4','parte-sem-partes-iguais')],0,'A pizza tem 4 partes iguais e Joao comeu 1. Fracao: 1/4.',[vv('Uma barra tem 6 partes. Ana comeu 1. Que fracao?',[o('1/6'),o('6/1','confunde-num-den'),o('1/5','todo-nao-e-inteiro'),o('2/6','parte-sem-partes-iguais')],0),vv('Uma fita foi cortada em 8 partes. Pedro usou 1. Que fracao?',[o('1/8'),o('8/1','confunde-num-den'),o('1/7','todo-nao-e-inteiro'),o('2/8','parte-sem-partes-iguais')],0)]),
      Q('O que representa o denominador de uma fracao?',[o('Total de partes iguais em que o todo foi dividido'),o('Quantas partes voce tem','confunde-num-den'),o('O tamanho de cada parte','parte-sem-partes-iguais'),o('Metade do todo','maior-denominador-maior-fracao')],0,'O denominador diz em quantas partes iguais o todo foi dividido.',[vv('Em 3/5, o que significa o 5?',[o('O todo foi dividido em 5 partes iguais'),o('Voce tem 5 partes','confunde-num-den'),o('Faltam 5 partes','parte-sem-partes-iguais'),o('Metade do todo','maior-denominador-maior-fracao')],0),vv('Em 2/8, o que significa o 8?',[o('O todo foi dividido em 8 partes iguais'),o('Voce tem 8 partes','confunde-num-den'),o('O todo dobrado','parte-sem-partes-iguais'),o('Metade do todo','maior-denominador-maior-fracao')],0)]),
      Q('Qual fracao e menor: 1/2 ou 1/4?',[o('1/4, pois com numerador 1 maior denominador da parte menor'),o('1/2, pois 2 e menor que 4','maior-denominador-maior-fracao'),o('Sao iguais, mesmo numerador','parte-sem-partes-iguais'),o('1/4, pois 4 e numero grande','confunde-num-den')],0,'Com numerador 1: maior denominador = parte menor. 1/4 menor que 1/2.',[vv('Qual e menor: 1/3 ou 1/5?',[o('1/5, cada quinto e menor que cada terco'),o('1/3, pois 3 menor que 5','maior-denominador-maior-fracao'),o('Sao iguais','parte-sem-partes-iguais'),o('1/5 e grande','confunde-num-den')],0),vv('Qual e maior: 1/2 ou 1/8?',[o('1/2, cada metade e maior que cada oitavo'),o('1/8, pois 8 maior que 2','maior-denominador-maior-fracao'),o('Sao iguais','parte-sem-partes-iguais'),o('1/8','confunde-num-den')],0)])
    ]),
    A('PK-EF04MA09-A2','exemplo_guiado','QUIZ','Exemplo guiado: lendo e escrevendo fracoes','Para escrever uma fracao: conte as partes iguais no total (denominador) e as partes marcadas (numerador).',5,'Para escrever uma fracao, conte as partes iguais no total — esse e o denominador — e as partes marcadas — esse e o numerador.',[
      Q('Um copo tem 10 partes iguais. 1 esta pintada. Que fracao?',[o('1/10'),o('10/1','confunde-num-den'),o('1/9','todo-nao-e-inteiro'),o('2/10','parte-sem-partes-iguais')],0,'Passo 1: total = 10. Passo 2: pintadas = 1. Fracao = 1/10.',[vv('Uma regua tem 5 partes iguais. 1 marcada. Que fracao?',[o('1/5'),o('5/1','confunde-num-den'),o('1/4','todo-nao-e-inteiro'),o('2/5','parte-sem-partes-iguais')],0),vv('Uma horta tem 8 canteiros iguais. 1 tem flores. Que fracao?',[o('1/8'),o('8/1','confunde-num-den'),o('1/7','todo-nao-e-inteiro'),o('2/8','parte-sem-partes-iguais')],0)]),
      Q('Maria tem 1/5 de um pao. Isso significa que o pao foi dividido em:',[o('5 partes iguais, e Maria tem 1'),o('1 parte, sobrou 5','confunde-num-den'),o('5 partes, Maria tem 5','todo-nao-e-inteiro'),o('10 partes, Maria tem 1','parte-sem-partes-iguais')],0,'1/5: o pao foi dividido em 5 partes iguais, e Maria tem 1.',[vv('Pedro tem 1/4 de um bloco:',[o('4 partes iguais, Pedro tem 1'),o('1 parte, sobrou 4','confunde-num-den'),o('4 partes, Pedro tem 4','todo-nao-e-inteiro'),o('8 partes, Pedro tem 1','parte-sem-partes-iguais')],0),vv('Lara bebeu 1/3 de um suco:',[o('3 partes iguais, Lara bebeu 1'),o('1 parte, sobrou 3','confunde-num-den'),o('3 partes, Lara bebeu 3','todo-nao-e-inteiro'),o('6 partes, Lara bebeu 1','parte-sem-partes-iguais')],0)])
    ]),
    A('PK-EF04MA09-A3','praticar','QUIZ','Praticar: fracoes unitarias no dia a dia','Pratique fracoes unitarias.',7,'Pratique fracoes unitarias no dia a dia.',[
      Q('Um bolo foi cortado em 8 fatias iguais. Que fracao e 1 fatia?',[o('1/8'),o('8/1','confunde-num-den'),o('1/7','todo-nao-e-inteiro'),o('2/8','parte-sem-partes-iguais')],0,'O bolo tem 8 fatias iguais. Uma fatia = 1/8.',[vv('Uma laranja tem 6 gomos iguais. Que fracao e 1 gomo?',[o('1/6'),o('6/1','confunde-num-den'),o('1/5','todo-nao-e-inteiro'),o('2/6','parte-sem-partes-iguais')],0),vv('Uma maca tem 4 partes iguais. Que fracao e 1 parte?',[o('1/4'),o('4/1','confunde-num-den'),o('1/3','todo-nao-e-inteiro'),o('2/4','parte-sem-partes-iguais')],0)]),
      Q('Qual fracao representa metade?',[o('1/2'),o('2/1','confunde-num-den'),o('1/4','todo-nao-e-inteiro'),o('2/4','parte-sem-partes-iguais')],0,'Metade = o todo dividido em 2 partes iguais, voce tem 1.',[vv('Qual fracao representa um terco?',[o('1/3'),o('3/1','confunde-num-den'),o('1/4','todo-nao-e-inteiro'),o('2/3','parte-sem-partes-iguais')],0),vv('Qual fracao representa um quarto?',[o('1/4'),o('4/1','confunde-num-den'),o('1/5','todo-nao-e-inteiro'),o('2/4','parte-sem-partes-iguais')],0)]),
      Q('1 de 6 partes iguais de uma torta corresponde a que fracao?',[o('1/6'),o('6/1','confunde-num-den'),o('1/5','todo-nao-e-inteiro'),o('1/3','parte-sem-partes-iguais')],0,'1 parte de 6 iguais = fracao 1/6.',[vv('1 de 10 partes iguais de uma barra?',[o('1/10'),o('10/1','confunde-num-den'),o('1/9','todo-nao-e-inteiro'),o('1/5','parte-sem-partes-iguais')],0),vv('1 de 8 partes iguais de uma pizza?',[o('1/8'),o('8/1','confunde-num-den'),o('1/7','todo-nao-e-inteiro'),o('1/4','parte-sem-partes-iguais')],0)])
    ]),
    A('PK-EF04MA09-A4','aplicar','QUIZ','Aplicar: fracoes unitarias em situacoes reais','Use fracoes unitarias no dia a dia.',7,'Use fracoes unitarias para resolver situacoes do dia a dia.',[
      Q('A mae de Luisa cortou uma torta em 6 partes iguais. Luisa comeu 1 fatia. Que fracao?',[o('1/6'),o('6/1','confunde-num-den'),o('1/5','todo-nao-e-inteiro'),o('1/3','parte-sem-partes-iguais')],0,'A torta foi dividida em 6 partes. Luisa comeu 1. Fracao = 1/6.',[vv('Uma melancia foi cortada em 8 fatias. Carlos comeu 1. Que fracao?',[o('1/8'),o('8/1','confunde-num-den'),o('1/7','todo-nao-e-inteiro'),o('1/4','parte-sem-partes-iguais')],0),vv('Cartolina dividida em 5 partes iguais. Um grupo recebeu 1. Que fracao?',[o('1/5'),o('5/1','confunde-num-den'),o('1/4','todo-nao-e-inteiro'),o('1/10','parte-sem-partes-iguais')],0)])
    ]),
    A('PK-EF04MA09-A5','explicar','SPOKEN','Explicar: o que e uma fracao','Explique com suas palavras o que e uma fracao e de um exemplo do dia a dia que voce inventou.',5,'Explique com suas palavras o que e uma fracao. De um exemplo do dia a dia que voce inventou.',null,{type:'SPOKEN',criteria:[{code:'definicao',description:'Menciona que fracao e uma parte de um todo dividido em partes iguais'},{code:'exemplo-proprio',description:'Da um exemplo concreto e correto, diferente dos usados na aula'},{code:'numerador-denominador',description:'Explica o papel do numerador e do denominador'}],exemploBoaResposta:'Uma fracao mostra uma parte de um inteiro. Se eu cortar um pao em 4 pedacos iguais e comer 1, eu comi 1/4 do pao. O 4 e o total e o 1 e quantos eu comi.'})
  ]
};

// EF05MA03 inline (simplificado mas valido)
const tEF05MA03 = {
  skillCode:'EF05MA03',
  title:'Trilha: Identificar e representar fracoes (EF05MA03)',
  activities:[
    A('PK-EF05MA03-A1','relembrar','QUIZ','Relembrar: fracoes e representacao','Vamos relembrar representacao de fracoes.',4,'Vamos relembrar como representar fracoes em diferentes situacoes.',[
      Q('Uma turma de 20 alunos em 4 grupos iguais: que fracao e 1 grupo?',[o('1/4'),o('5/20','numerador-e-posicao'),o('4/20','confunde-num-den'),o('1/5','reta-sem-escala')],0,'Dividida em 4 grupos, 1 grupo = 1/4.',[vv('5 sacolas iguais: que fracao e 1?',[o('1/5'),o('5/1','numerador-e-posicao'),o('5/5','confunde-num-den'),o('1/4','reta-sem-escala')],0),vv('3 mesas iguais: que fracao e 1?',[o('1/3'),o('3/1','numerador-e-posicao'),o('3/3','confunde-num-den'),o('1/2','reta-sem-escala')],0)]),
      Q('Reta de 0 a 1 dividida em 4 partes. O segundo traco marca:',[o('2/4'),o('4/2','confunde-num-den'),o('1/4','reta-sem-escala'),o('3/4','numerador-e-posicao')],0,'4 partes: 1o=1/4, 2o=2/4, 3o=3/4.',[vv('Reta de 0 a 1 em 5 partes. O terceiro traco:',[o('3/5'),o('5/3','confunde-num-den'),o('1/5','reta-sem-escala'),o('4/5','numerador-e-posicao')],0),vv('Reta de 0 a 1 em 3 partes. O primeiro traco:',[o('1/3'),o('3/1','confunde-num-den'),o('2/3','reta-sem-escala'),o('3/3','numerador-e-posicao')],0)])
    ]),
    A('PK-EF05MA03-A2','exemplo_guiado','QUIZ','Exemplo guiado: marcando fracoes na reta','Veja como colocar fracoes na reta.',5,'Para colocar fracao na reta: Passo 1 — olhe o denominador para saber em quantas partes dividir. Passo 2 — conte o numerador a partir do zero.',[
      Q('Para marcar 3/4 na reta: quantas partes iguais divido o intervalo?',[o('4 partes iguais'),o('3 partes iguais','numerador-e-posicao'),o('12 partes iguais','reta-sem-escala'),o('7 partes iguais','fracao-maior-1-impossivel')],0,'Denominador 4 = numero de partes. Depois conte 3.',[vv('Para marcar 2/5: quantas partes?',[o('5 partes'),o('2 partes','numerador-e-posicao'),o('10 partes','reta-sem-escala'),o('7 partes','fracao-maior-1-impossivel')],0),vv('Para marcar 1/6: quantas partes?',[o('6 partes'),o('1 parte','numerador-e-posicao'),o('12 partes','reta-sem-escala'),o('7 partes','fracao-maior-1-impossivel')],0)]),
      Q('Marque 5/4 na reta. Entre quais inteiros ela fica?',[o('Entre 1 e 2, pois 5/4 maior que 1'),o('Entre 0 e 1','fracao-maior-1-impossivel'),o('Entre 4 e 5','numerador-e-posicao'),o('No 1','reta-sem-escala')],0,'5/4 = 1 inteiro + 1/4. Fica entre 1 e 2.',[vv('7/3 fica entre quais inteiros?',[o('Entre 2 e 3, pois 7/3 aprox 2,33'),o('Entre 0 e 1','fracao-maior-1-impossivel'),o('Entre 7 e 3','numerador-e-posicao'),o('No 3','reta-sem-escala')],0),vv('3/2 fica entre quais inteiros?',[o('Entre 1 e 2, pois 3/2=1,5'),o('Entre 0 e 1','fracao-maior-1-impossivel'),o('Entre 2 e 3','numerador-e-posicao'),o('No 2','reta-sem-escala')],0)])
    ]),
    A('PK-EF05MA03-A3','praticar','QUIZ','Praticar: representar fracoes','Pratique.',7,'Pratique a representacao de fracoes.',[
      Q('Marcos acertou 7 de 10 questoes. Que fracao?',[o('7/10'),o('10/7','confunde-num-den'),o('3/10','numerador-e-posicao'),o('7/3','fracao-maior-1-impossivel')],0,'Total=10, acertos=7. Fracao=7/10.',[vv('Equipe ganhou 5 de 8 provas. Que fracao?',[o('5/8'),o('8/5','confunde-num-den'),o('3/8','numerador-e-posicao'),o('5/3','fracao-maior-1-impossivel')],0),vv('Loja vendeu 9 de 12 pares. Que fracao?',[o('9/12'),o('12/9','confunde-num-den'),o('3/12','numerador-e-posicao'),o('9/3','fracao-maior-1-impossivel')],0)]),
      Q('Para 5/8 na reta: divido o intervalo 0-1 em:',[o('8 partes e conto 5'),o('5 partes e conto 8','numerador-e-posicao'),o('40 partes','reta-sem-escala'),o('Coloco o 5 diretamente','fracao-maior-1-impossivel')],0,'Denominador=8: numero de partes. Numerador=5: partes a contar.',[vv('Para 4/6, divido em:',[o('6 partes e conto 4'),o('4 partes e conto 6','numerador-e-posicao'),o('24 partes','reta-sem-escala'),o('Coloco o 4 diretamente','fracao-maior-1-impossivel')],0),vv('Para 7/10, divido em:',[o('10 partes e conto 7'),o('7 partes e conto 10','numerador-e-posicao'),o('70 partes','reta-sem-escala'),o('Coloco o 7 diretamente','fracao-maior-1-impossivel')],0)])
    ]),
    A('PK-EF05MA03-A4','aplicar','QUIZ','Aplicar: fracoes em contextos reais','Use representacao de fracoes para resolver problemas.',7,'Use representacao de fracoes em contextos reais.',[
      Q('Uma receita usa 3/4 de xicara de farinha. Ja tem 1/2. Tem suficiente?',[o('Nao, pois 1/2=2/4 menor que 3/4'),o('Sim, denominador menor','maior-denominador-maior-fracao'),o('Sim, sao quase iguais','fracao-maior-1-impossivel'),o('Nao sei comparar','reta-sem-escala')],0,'1/2=2/4. Voce tem 2/4 e precisa de 3/4. Nao tem.',[vv('Para suco precisa de 2/3 de litro. Voce tem 1/2. Tem?',[o('Nao, 1/2 menor que 2/3'),o('Sim, denominador menor','maior-denominador-maior-fracao'),o('Sim, sao parecidas','fracao-maior-1-impossivel'),o('Nao sei','reta-sem-escala')],0),vv('Precisa de 5/8 m. Voce tem 3/4. Tem material?',[o('Sim, 3/4 maior que 5/8'),o('Nao, 8 maior que 4','maior-denominador-maior-fracao'),o('Sao iguais','fracao-maior-1-impossivel'),o('Nao sei','reta-sem-escala')],0)]),
      Q('De 24 alunos, 18 fizeram a tarefa. Que fracao fez?',[o('18/24'),o('24/18','confunde-num-den'),o('6/24','numerador-e-posicao'),o('18/6','fracao-maior-1-impossivel')],0,'Total=24, fizeram=18. Fracao=18/24.',[vv('De 30, 20 foram a excursao. Que fracao?',[o('20/30'),o('30/20','confunde-num-den'),o('10/30','numerador-e-posicao'),o('20/10','fracao-maior-1-impossivel')],0),vv('De 15 questoes, 9 foram respondidas. Que fracao?',[o('9/15'),o('15/9','confunde-num-den'),o('6/15','numerador-e-posicao'),o('9/6','fracao-maior-1-impossivel')],0)])
    ]),
    A('PK-EF05MA03-A5','explicar','WRITTEN','Explicar: fracoes na reta numerica','Explique como colocar 3/4 na reta numerica.',5,'Explique como colocar a fracao 3/4 na reta numerica. Descreva o passo a passo.',null,{type:'WRITTEN',criteria:[{code:'usa-denominador',description:'Menciona que o denominador define em quantas partes dividir'},{code:'conta-numerador',description:'O numerador indica quantas partes contar a partir do 0'},{code:'sequencia-correta',description:'A descricao segue a ordem correta'}],exemploBoaResposta:'Para colocar 3/4 na reta, primeiro divido o espaco entre 0 e 1 em 4 partes iguais. Depois conto 3 partes a partir do zero. Esse ponto e o 3/4.'})
  ]
};

// EF05MA04 inline (simplificado)
const tEF05MA04 = {
  skillCode:'EF05MA04',
  title:'Trilha: Fracoes equivalentes (EF05MA04)',
  activities:[
    A('PK-EF05MA04-A1','relembrar','QUIZ','Relembrar: fracoes equivalentes','Fracoes equivalentes representam a mesma quantidade.',4,'Fracoes equivalentes representam a mesma quantidade mas escritas de forma diferente.',[
      Q('1/2 e equivalente a 2/4?',[o('Sim, 1x2=2 e 2x2=4'),o('Nao, 1 diferente de 2','equivalencia-visual-apenas'),o('Nao, denominadores diferentes','mmc-nao-e-necessario'),o('Sim, somei 1 e 2','soma-para-equivaler')],0,'Multiplica numerador E denominador por 2: 1/2 = 2/4.',[vv('2/3 e equivalente a 4/6?',[o('Sim, 2x2=4 e 3x2=6'),o('Nao, 2 diferente de 4','equivalencia-visual-apenas'),o('Nao, denominadores diferentes','mmc-nao-e-necessario'),o('Sim, somei','soma-para-equivaler')],0),vv('3/5 e equivalente a 6/10?',[o('Sim, 3x2=6 e 5x2=10'),o('Nao, 3 diferente de 6','equivalencia-visual-apenas'),o('Nao, denominadores diferentes','mmc-nao-e-necessario'),o('Sim, somei','soma-para-equivaler')],0)])
    ]),
    A('PK-EF05MA04-A2','exemplo_guiado','QUIZ','Exemplo guiado: gerando equivalentes','Para gerar equivalente: multiplique ou divida numerador E denominador pelo mesmo numero.',5,'Para gerar uma fracao equivalente, multiplique ou divida o numerador e o denominador pelo mesmo numero.',[
      Q('Forma mais simplificada de 10/15?',[o('2/3'),o('5/10','simplifica-so-num'),o('10/15 ja e simples','equivalencia-visual-apenas'),o('1/3','mmc-nao-e-necessario')],0,'MDC(10,15)=5. 10/5=2, 15/5=3. Resultado: 2/3.',[vv('Forma mais simplificada de 8/12?',[o('2/3'),o('4/8','simplifica-so-num'),o('8/12 ja e simples','equivalencia-visual-apenas'),o('1/3','mmc-nao-e-necessario')],0),vv('Forma mais simplificada de 6/9?',[o('2/3'),o('3/6','simplifica-so-num'),o('6/9 ja e simples','equivalencia-visual-apenas'),o('1/3','mmc-nao-e-necessario')],0)])
    ]),
    A('PK-EF05MA04-A3','praticar','QUIZ','Praticar: equivalencia e simplificacao','Pratique encontrar e simplificar fracoes equivalentes.',7,'Pratique encontrar fracoes equivalentes e simplificar fracoes.',[
      Q('Qual equivale a 4/6?',[o('2/3'),o('5/7','soma-para-equivaler'),o('4/3','simplifica-so-num'),o('8/6','equivalencia-visual-apenas')],0,'4/6 dividido por 2 = 2/3.',[vv('Equivalente de 6/9?',[o('2/3'),o('7/10','soma-para-equivaler'),o('6/3','simplifica-so-num'),o('12/9','equivalencia-visual-apenas')],0),vv('Equivalente de 10/14?',[o('5/7'),o('11/15','soma-para-equivaler'),o('10/7','simplifica-so-num'),o('20/14','equivalencia-visual-apenas')],0)])
    ]),
    A('PK-EF05MA04-A4','aplicar','QUIZ','Aplicar: equivalencia em problemas','Resolva problemas usando equivalencia de fracoes.',7,'Resolva problemas usando equivalencia de fracoes.',[
      Q('Maria tem 3/6 de barra. Joao tem 1/2. Quem tem mais?',[o('Sao iguais, pois 3/6=1/2'),o('Joao, 1 menor que 3','equivalencia-visual-apenas'),o('Maria, 6 maior que 2','mmc-nao-e-necessario'),o('Nao e possivel comparar','soma-para-equivaler')],0,'3/6=1/2. Sao iguais.',[vv('Ana tem 4/8. Carlos tem 1/2. Quem tem mais?',[o('Sao iguais, pois 4/8=1/2'),o('Carlos','equivalencia-visual-apenas'),o('Ana','mmc-nao-e-necessario'),o('Nao e possivel','soma-para-equivaler')],0),vv('Lara bebeu 6/9. Bia bebeu 2/3. Quem bebeu mais?',[o('Sao iguais, pois 6/9=2/3'),o('Bia','equivalencia-visual-apenas'),o('Lara','mmc-nao-e-necessario'),o('Nao e possivel','soma-para-equivaler')],0)])
    ]),
    A('PK-EF05MA04-A5','explicar','SPOKEN','Explicar: por que 2/4 e 1/2 sao iguais','Explique por que 2 quartos e 1 metade representam a mesma quantidade.',5,'Explique com suas palavras por que 2 quartos e 1 metade representam a mesma quantidade. Use um exemplo concreto.',null,{type:'SPOKEN',criteria:[{code:'usa-multiplicacao',description:'Menciona multiplicar numerador e denominador pelo mesmo numero'},{code:'exemplo-correto',description:'Da um exemplo concreto correto'},{code:'clareza',description:'A explicacao e clara'}],exemploBoaResposta:'Se voce cortar uma pizza em 2 partes iguais, 1 parte e 1/2. Se cortar a mesma pizza em 4 partes, 2 partes sao a mesma quantidade. Por isso 2/4 = 1/2.'})
  ]
};

// EF05MA05 inline (simplificado)
const tEF05MA05 = {
  skillCode:'EF05MA05',
  title:'Trilha: Comparar e ordenar fracoes na reta (EF05MA05)',
  activities:[
    A('PK-EF05MA05-A1','relembrar','QUIZ','Relembrar: comparando fracoes','Para comparar fracoes com mesmo denominador, compare so os numeradores.',4,'Para comparar fracoes com mesmo denominador, compare so os numeradores.',[
      Q('Qual e maior: 3/7 ou 5/7?',[o('5/7, pois 5 maior que 3'),o('3/7','compara-num-separado'),o('Sao iguais','maior-denominador-maior-fracao'),o('3/7','decimal-sem-converter')],0,'Mesmo denominador: maior numerador = maior fracao.',[vv('Qual e maior: 4/9 ou 7/9?',[o('7/9, pois 7 maior que 4'),o('4/9','compara-num-separado'),o('Sao iguais','maior-denominador-maior-fracao'),o('4/9','decimal-sem-converter')],0),vv('Qual e menor: 2/5 ou 4/5?',[o('2/5, pois 2 menor que 4'),o('4/5','compara-num-separado'),o('Sao iguais','maior-denominador-maior-fracao'),o('4/5','decimal-sem-converter')],0)])
    ]),
    A('PK-EF05MA05-A2','exemplo_guiado','QUIZ','Exemplo guiado: comparando com denominadores diferentes','Para comparar fracoes com denominadores diferentes, iguale os denominadores.',5,'Para comparar fracoes com denominadores diferentes, iguale os denominadores usando equivalencia ou converta para decimal.',[
      Q('Compare 2/3 e 3/4. Qual e maior? (use denominador 12)',[o('3/4, pois 2/3=8/12 e 3/4=9/12'),o('2/3, pois 2 menor','compara-num-separado'),o('Sao iguais','decimal-sem-converter'),o('2/3, pois 3 menor','maior-denominador-maior-fracao')],0,'MMC(3,4)=12. 2/3=8/12; 3/4=9/12. 3/4 e maior.',[vv('Compare 1/2 e 2/5. Qual e maior?',[o('1/2, pois 1/2=5/10 e 2/5=4/10'),o('2/5, pois 2 maior','compara-num-separado'),o('Sao iguais','decimal-sem-converter'),o('2/5, pois 5 maior','maior-denominador-maior-fracao')],0),vv('Compare 3/5 e 5/8. Qual e maior?',[o('5/8, pois 3/5=24/40 e 5/8=25/40'),o('3/5, pois 3 menor','compara-num-separado'),o('Sao iguais','decimal-sem-converter'),o('3/5, pois 5 menor','maior-denominador-maior-fracao')],0)])
    ]),
    A('PK-EF05MA05-A3','praticar','QUIZ','Praticar: comparar e ordenar','Pratique comparar e ordenar fracoes.',7,'Pratique comparar e ordenar fracoes com denominadores iguais e diferentes.',[
      Q('Coloque em ordem crescente: 3/4, 2/3, 5/6.',[o('2/3 menor que 3/4 menor que 5/6'),o('5/6 menor que 3/4 menor que 2/3','maior-denominador-maior-fracao'),o('2/3 menor que 5/6 menor que 3/4','compara-num-separado'),o('3/4 menor que 2/3 menor que 5/6','decimal-sem-converter')],0,'MMC=12. 2/3=8/12, 3/4=9/12, 5/6=10/12. Ordem: 2/3 menor que 3/4 menor que 5/6.',[vv('Ordem crescente: 1/2, 2/5, 3/4.',[o('2/5 menor que 1/2 menor que 3/4'),o('3/4 menor que 1/2 menor que 2/5','maior-denominador-maior-fracao'),o('1/2 menor que 2/5 menor que 3/4','compara-num-separado'),o('3/4 menor que 2/5 menor que 1/2','decimal-sem-converter')],0),vv('Ordem decrescente: 1/3, 3/5, 2/4.',[o('3/5 maior que 2/4 maior que 1/3'),o('1/3 maior que 2/4 maior que 3/5','maior-denominador-maior-fracao'),o('3/5 maior que 1/3 maior que 2/4','compara-num-separado'),o('2/4 maior que 3/5 maior que 1/3','decimal-sem-converter')],0)])
    ]),
    A('PK-EF05MA05-A4','aplicar','QUIZ','Aplicar: ordenar fracoes em situacoes reais','Use ordenacao para resolver problemas.',7,'Use ordenacao e comparacao de fracoes para resolver problemas do cotidiano.',[
      Q('Marcos tem R$ 0,80. Uma figurinha custa 3/4 de real. Ele tem?',[o('Sim, 3/4=R$0,75 e Marcos tem R$0,80'),o('Nao, fracao nao e decimal','decimal-sem-converter'),o('Nao, R$0,80 menor que 3','compara-num-separado'),o('Nao, 4 maior que 0,80','maior-denominador-maior-fracao')],0,'3/4=0,75. Marcos tem 0,80. 0,80 maior que 0,75: tem.',[vv('Joao tem R$0,60. Um salgadinho custa 2/3. Ele tem?',[o('Nao, 2/3 aprox 0,667 maior que 0,60'),o('Sim, fracao','decimal-sem-converter'),o('Sim, R$0,60 maior que 2','compara-num-separado'),o('Nao, 3 maior que 0,60','maior-denominador-maior-fracao')],0),vv('Caneta custa 1/4 de real. Luisa tem R$0,20. Ela tem?',[o('Nao, 1/4=R$0,25 e ela tem R$0,20'),o('Sim, fracao','decimal-sem-converter'),o('Sim, R$0,20 maior que 1','compara-num-separado'),o('Sim, 4 maior que 0,25','maior-denominador-maior-fracao')],0)])
    ]),
    A('PK-EF05MA05-A5','explicar','WRITTEN','Explicar: como comparar fracoes com denominadores diferentes','Explique como voce faz para saber qual e maior entre 2/3 e 3/4.',5,'Explique como voce faz para saber qual e maior entre 2 tercas e 3 quartos. Descreva o passo a passo.',null,{type:'WRITTEN',criteria:[{code:'estrategia-valida',description:'Usa uma estrategia valida: converter para decimal, usar denominador comum, ou barras visuais'},{code:'resultado-correto',description:'Chega ao resultado correto: 3/4 maior que 2/3'},{code:'explica-o-passo',description:'Descreve pelo menos um passo do processo'}],exemploBoaResposta:'Para comparar 2/3 e 3/4, primeiro encontro um denominador igual. O MMC de 3 e 4 e 12. Entao 2/3 vira 8/12 e 3/4 vira 9/12. Como 9 maior que 8, a fracao 3/4 e maior.'})
  ]
};

// ===== Montar pacotes =====
const FRAC = {
  id: 'PKG-FRAC-DEMO',
  nome: 'Pacote de demonstracao: Fracoes',
  descricao: 'Pacote completo de fracoes para a demonstracao: 4o, 5o e 6o anos, incluindo degraus.',
  reviewNote: 'pacote de demonstracao, revisao pedagogica pendente',
  source: 'SPEAKFLOW',
  status: 'APPROVED',
  trilhas: [
    tEF04MA09,
    tEF05MA03,
    tEF05MA04,
    tEF05MA05,
    tEF06MA07,
    tEF06MA08,
    tEF06MA09,
    tEF06MA10,
  ]
};

const LP05 = {
  id: 'PKG-LP05-DEMO',
  nome: 'Pacote de demonstracao: Leitura 5o ano',
  descricao: 'Pacote de trilhas de leitura para o 5o ano, para a demonstracao.',
  reviewNote: 'pacote de demonstracao, revisao pedagogica pendente',
  source: 'SPEAKFLOW',
  status: 'APPROVED',
  textos: LP_TEXTOS,
  trilhas: [
    tEF15LP03,
    tEF35LP03,
    tEF35LP04,
    tEF35LP05,
  ]
};

// ===== Diagnosticos =====
// Questoes diagnosticas — 2 por habilidade do 6o (habilidades principais)
// A questao critica soma-num-e-den-separado esta no EF06MA10/EF06MA07
function dq(id, skillCode, question, options, correctIndex, explanation) {
  return { id, skillCode, question, options, correctIndex, explanation };
}

const DIAG_FRAC_6A_INICIO = {
  id: 'DIAG-FRAC-6A-INICIO',
  titulo: 'Diagnostico de Fracoes — 6o ano (inicio do bimestre)',
  descricao: 'Avaliacao diagnostica de fracoes para o 6o ano, aplicada no inicio do bimestre.',
  status: 'APPROVED',
  source: 'SPEAKFLOW',
  reviewNote: 'pacote de demonstracao, revisao pedagogica pendente',
  items: [
    // EF06MA07 — comparar e ordenar fracoes
    dq('DI-FRAC6-EF06MA07-01','EF06MA07',
      'Qual e maior: 2/3 ou 3/4?',
      [{text:'3/4, pois 2/3=8/12 e 3/4=9/12'},{text:'2/3, pois 2 menor que 3',misconceptionCode:'soma-num-e-den-separado'},{text:'Sao iguais',misconceptionCode:'nao-usa-mmc'},{text:'2/3, pois 3 menor que 4',misconceptionCode:'maior-denominador-maior-fracao'}],
      0,'MMC(3,4)=12. 2/3=8/12; 3/4=9/12. 3/4 e maior.'),
    dq('DI-FRAC6-EF06MA07-02','EF06MA07',
      'Ordene do menor ao maior: 1/2, 2/3, 1/4.',
      [{text:'1/4 menor que 1/2 menor que 2/3'},{text:'1/2 menor que 1/4 menor que 2/3',misconceptionCode:'maior-denominador-maior-fracao'},{text:'2/3 menor que 1/2 menor que 1/4',misconceptionCode:'soma-num-e-den-separado'},{text:'Sao iguais',misconceptionCode:'nao-usa-mmc'}],
      0,'MMC=12. 1/4=3/12; 1/2=6/12; 2/3=8/12. Ordem: 1/4 menor que 1/2 menor que 2/3.'),
    // EF06MA08 — fracoes e decimais
    dq('DI-FRAC6-EF06MA08-01','EF06MA08',
      'Qual decimal equivale a 3/4?',
      [{text:'0,75'},{text:'0,34',misconceptionCode:'decimal-invertido'},{text:'0,43',misconceptionCode:'compara-num-separado'},{text:'1,33',misconceptionCode:'maior-denominador-maior-fracao'}],
      0,'3 dividido por 4 = 0,75.'),
    dq('DI-FRAC6-EF06MA08-02','EF06MA08',
      'Qual fracao irredutivel equivale a 0,6?',
      [{text:'3/5'},{text:'6/10 nao simplificada',misconceptionCode:'decimal-nao-e-fracao'},{text:'6/1',misconceptionCode:'confunde-parte-inteira'},{text:'0/6',misconceptionCode:'decimal-invertido'}],
      0,'0,6=6/10. MDC(6,10)=2. Resultado: 3/5.'),
    // EF06MA09 — fracao de quantidade
    dq('DI-FRAC6-EF06MA09-01','EF06MA09',
      'Qual e 3/4 de 40?',
      [{text:'30'},{text:'10, so 1/4 de 40',misconceptionCode:'fracao-quantid-subtrai'},{text:'160',misconceptionCode:'fracao-quantid-multiplica'},{text:'43',misconceptionCode:'fracao-quantid-soma'}],
      0,'40 dividido por 4 = 10. 10 vezes 3 = 30.'),
    dq('DI-FRAC6-EF06MA09-02','EF06MA09',
      'Uma escola tem 300 alunos. 2/5 praticam atletismo. Quantos?',
      [{text:'120'},{text:'1500',misconceptionCode:'fracao-quantid-multiplica'},{text:'295',misconceptionCode:'fracao-quantid-subtrai'},{text:'305',misconceptionCode:'fracao-quantid-soma'}],
      0,'300 dividido por 5 = 60. 60 vezes 2 = 120.'),
    // EF06MA10 — adicao e subtracao (questao critica: soma-num-e-den-separado)
    dq('DI-FRAC6-EF06MA10-01','EF06MA10',
      'Quanto e 1/2 + 1/3?',
      [{text:'5/6'},{text:'2/5',misconceptionCode:'soma-num-e-den-separado'},{text:'1/6',misconceptionCode:'subtrai-ao-inves-de-somar'},{text:'2/6',misconceptionCode:'nao-usa-mmc'}],
      0,'MMC(2,3)=6. 1/2=3/6; 1/3=2/6. Total: 5/6. Nunca some numerador e denominador separados.'),
    dq('DI-FRAC6-EF06MA10-02','EF06MA10',
      'Pedro andou 3/4 km de manha e 1/3 km de tarde. Quantos km no total?',
      [{text:'13/12 km'},{text:'4/7 km, pois 3+1=4 e 4+3=7',misconceptionCode:'soma-num-e-den-separado'},{text:'2/12 km',misconceptionCode:'subtrai-ao-inves-de-somar'},{text:'9/12 km',misconceptionCode:'nao-usa-mmc'}],
      0,'3/4=9/12; 1/3=4/12. Total: 13/12 km.'),
    // --- banco do degrau (5o e 4o anos) ---
    dq('DI-FRAC6-EF05MA03-01','EF05MA03',
      'Uma turma de 20 alunos em 4 grupos iguais. Que fracao e 1 grupo?',
      [{text:'1/4'},{text:'5/20',misconceptionCode:'numerador-e-posicao'},{text:'4/20',misconceptionCode:'confunde-num-den'},{text:'1/5',misconceptionCode:'reta-sem-escala'}],
      0,'Dividida em 4 grupos iguais, 1 grupo = 1/4.'),
    dq('DI-FRAC6-EF05MA03-02','EF05MA03',
      'Na reta entre 0 e 1 dividida em 5 partes iguais, o terceiro traco marca:',
      [{text:'3/5'},{text:'5/3',misconceptionCode:'confunde-num-den'},{text:'1/5',misconceptionCode:'reta-sem-escala'},{text:'4/5',misconceptionCode:'numerador-e-posicao'}],
      0,'5 partes: 1o=1/5, 2o=2/5, 3o=3/5.'),
    dq('DI-FRAC6-EF05MA04-01','EF05MA04',
      '1/2 e equivalente a 2/4?',
      [{text:'Sim, 1x2=2 e 2x2=4'},{text:'Nao, 1 diferente de 2',misconceptionCode:'equivalencia-visual-apenas'},{text:'Nao, denominadores diferentes',misconceptionCode:'mmc-nao-e-necessario'},{text:'Sim, somei 1 e 2',misconceptionCode:'soma-para-equivaler'}],
      0,'Multiplica numerador e denominador por 2: 2/4.'),
    dq('DI-FRAC6-EF05MA04-02','EF05MA04',
      'Forma mais simplificada de 6/8:',
      [{text:'3/4'},{text:'4/8',misconceptionCode:'simplifica-so-num'},{text:'6/8 ja e simples',misconceptionCode:'equivalencia-visual-apenas'},{text:'1/2',misconceptionCode:'mmc-nao-e-necessario'}],
      0,'MDC(6,8)=2. 6/2=3, 8/2=4. Resultado: 3/4.'),
    dq('DI-FRAC6-EF05MA05-01','EF05MA05',
      'Qual e menor: 1/3 ou 1/5?',
      [{text:'1/5, cada quinto e menor que cada terco'},{text:'1/3, pois 3 menor que 5',misconceptionCode:'maior-denominador-maior-fracao'},{text:'Sao iguais',misconceptionCode:'compara-num-separado'},{text:'1/5, e maior',misconceptionCode:'decimal-sem-converter'}],
      0,'Com numerador 1: maior denominador = menor fracao.'),
    dq('DI-FRAC6-EF05MA05-02','EF05MA05',
      'Qual decimal equivale a 2/5?',
      [{text:'0,4'},{text:'0,25',misconceptionCode:'decimal-sem-converter'},{text:'0,52',misconceptionCode:'compara-num-separado'},{text:'2,5',misconceptionCode:'maior-denominador-maior-fracao'}],
      0,'2 dividido por 5 = 0,4.'),
    dq('DI-FRAC6-EF04MA09-01','EF04MA09',
      'Uma pizza foi cortada em 4 partes iguais. Joao comeu 1 pedaco. Que fracao?',
      [{text:'1/4'},{text:'4/1',misconceptionCode:'confunde-num-den'},{text:'1/3',misconceptionCode:'todo-nao-e-inteiro'},{text:'2/4',misconceptionCode:'parte-sem-partes-iguais'}],
      0,'4 partes iguais, comeu 1. Fracao: 1/4.'),
    dq('DI-FRAC6-EF04MA09-02','EF04MA09',
      'Qual fracao representa metade?',
      [{text:'1/2'},{text:'2/1',misconceptionCode:'confunde-num-den'},{text:'1/4',misconceptionCode:'todo-nao-e-inteiro'},{text:'2/4',misconceptionCode:'parte-sem-partes-iguais'}],
      0,'Metade = todo dividido em 2 partes iguais, voce tem 1 = 1/2.'),
  ]
};

// Diagnostico de acompanhamento: mesmas habilidades, variantes das questoes
const DIAG_FRAC_6A_ACOMP = {
  id: 'DIAG-FRAC-6A-ACOMP',
  titulo: 'Diagnostico de Fracoes — 6o ano (acompanhamento)',
  descricao: 'Avaliacao de acompanhamento para verificar evolucao em fracoes no 6o ano.',
  status: 'APPROVED',
  source: 'SPEAKFLOW',
  reviewNote: 'pacote de demonstracao, revisao pedagogica pendente',
  items: [
    dq('DA-FRAC6-EF06MA07-01','EF06MA07',
      'Qual e maior: 3/5 ou 5/8?',
      [{text:'5/8, pois 3/5=24/40 e 5/8=25/40'},{text:'3/5, pois 3 menor que 5',misconceptionCode:'soma-num-e-den-separado'},{text:'Sao iguais',misconceptionCode:'nao-usa-mmc'},{text:'3/5, pois 5 menor que 8',misconceptionCode:'maior-denominador-maior-fracao'}],
      0,'MMC(5,8)=40. 3/5=24/40; 5/8=25/40. 5/8 e maior.'),
    dq('DA-FRAC6-EF06MA07-02','EF06MA07',
      'Ordene do menor ao maior: 2/3, 3/4, 5/6.',
      [{text:'2/3 menor que 3/4 menor que 5/6'},{text:'5/6 menor que 3/4 menor que 2/3',misconceptionCode:'maior-denominador-maior-fracao'},{text:'3/4 menor que 2/3 menor que 5/6',misconceptionCode:'soma-num-e-den-separado'},{text:'Sao iguais',misconceptionCode:'nao-usa-mmc'}],
      0,'MMC=12. 2/3=8/12; 3/4=9/12; 5/6=10/12. Ordem crescente.'),
    dq('DA-FRAC6-EF06MA08-01','EF06MA08',
      'Qual decimal equivale a 5/8?',
      [{text:'0,625'},{text:'0,58',misconceptionCode:'decimal-invertido'},{text:'0,85',misconceptionCode:'compara-num-separado'},{text:'5,8',misconceptionCode:'confunde-parte-inteira'}],
      0,'5 dividido por 8 = 0,625.'),
    dq('DA-FRAC6-EF06MA08-02','EF06MA08',
      'Qual fracao irredutivel equivale a 0,8?',
      [{text:'4/5'},{text:'8/10 sem simplificar',misconceptionCode:'decimal-nao-e-fracao'},{text:'8/1',misconceptionCode:'confunde-parte-inteira'},{text:'0/8',misconceptionCode:'decimal-invertido'}],
      0,'0,8=8/10. MDC(8,10)=2. Resultado: 4/5.'),
    dq('DA-FRAC6-EF06MA09-01','EF06MA09',
      'Qual e 2/5 de 25?',
      [{text:'10'},{text:'5, so 1/5',misconceptionCode:'fracao-quantid-subtrai'},{text:'125',misconceptionCode:'fracao-quantid-multiplica'},{text:'27',misconceptionCode:'fracao-quantid-soma'}],
      0,'25 dividido por 5 = 5. 5 vezes 2 = 10.'),
    dq('DA-FRAC6-EF06MA09-02','EF06MA09',
      'Uma turma tem 36 alunos. 2/3 fizeram a atividade. Quantos?',
      [{text:'24'},{text:'216',misconceptionCode:'fracao-quantid-multiplica'},{text:'33',misconceptionCode:'fracao-quantid-subtrai'},{text:'38',misconceptionCode:'fracao-quantid-soma'}],
      0,'36 dividido por 3 = 12. 12 vezes 2 = 24.'),
    dq('DA-FRAC6-EF06MA10-01','EF06MA10',
      'Quanto e 1/4 + 1/3?',
      [{text:'7/12'},{text:'2/7',misconceptionCode:'soma-num-e-den-separado'},{text:'1/12',misconceptionCode:'subtrai-ao-inves-de-somar'},{text:'2/12',misconceptionCode:'nao-usa-mmc'}],
      0,'MMC(4,3)=12. 1/4=3/12; 1/3=4/12. Total: 7/12.'),
    dq('DA-FRAC6-EF06MA10-02','EF06MA10',
      'Uma receita usa 3/4 de xicara de farinha. Ja tem 1/3. Quanto falta?',
      [{text:'5/12 xicara'},{text:'4/7 xicara',misconceptionCode:'soma-num-e-den-separado'},{text:'4/12 xicara',misconceptionCode:'nao-usa-mmc'},{text:'1/12 xicara',misconceptionCode:'subtrai-ao-inves-de-somar'}],
      0,'3/4=9/12; 1/3=4/12. Falta: 9/12 menos 4/12 = 5/12.'),
    // banco do degrau (variantes)
    dq('DA-FRAC6-EF05MA03-01','EF05MA03',
      'Uma caixa foi dividida em 5 sacolas iguais. Que fracao e 1 sacola?',
      [{text:'1/5'},{text:'5/1',misconceptionCode:'numerador-e-posicao'},{text:'5/5',misconceptionCode:'confunde-num-den'},{text:'1/4',misconceptionCode:'reta-sem-escala'}],
      0,'Dividida em 5 partes iguais, 1 parte = 1/5.'),
    dq('DA-FRAC6-EF05MA03-02','EF05MA03',
      'Reta de 0 a 1 dividida em 4 partes. O segundo traco marca:',
      [{text:'2/4'},{text:'4/2',misconceptionCode:'confunde-num-den'},{text:'1/4',misconceptionCode:'reta-sem-escala'},{text:'3/4',misconceptionCode:'numerador-e-posicao'}],
      0,'4 partes: 1o=1/4, 2o=2/4.'),
    dq('DA-FRAC6-EF05MA04-01','EF05MA04',
      '2/3 e equivalente a 4/6?',
      [{text:'Sim, 2x2=4 e 3x2=6'},{text:'Nao, 2 diferente de 4',misconceptionCode:'equivalencia-visual-apenas'},{text:'Nao, denominadores diferentes',misconceptionCode:'mmc-nao-e-necessario'},{text:'Sim, somei',misconceptionCode:'soma-para-equivaler'}],
      0,'Multiplica por 2: 4/6.'),
    dq('DA-FRAC6-EF05MA04-02','EF05MA04',
      'Forma mais simplificada de 9/12:',
      [{text:'3/4'},{text:'3/12',misconceptionCode:'simplifica-so-num'},{text:'9/12 ja e simples',misconceptionCode:'equivalencia-visual-apenas'},{text:'1/3',misconceptionCode:'mmc-nao-e-necessario'}],
      0,'MDC(9,12)=3. 9/3=3, 12/3=4. Resultado: 3/4.'),
    dq('DA-FRAC6-EF05MA05-01','EF05MA05',
      'Qual e menor: 1/4 ou 1/6?',
      [{text:'1/6, cada sexto e menor que cada quarto'},{text:'1/4, pois 4 menor que 6',misconceptionCode:'maior-denominador-maior-fracao'},{text:'Sao iguais',misconceptionCode:'compara-num-separado'},{text:'1/6, e maior',misconceptionCode:'decimal-sem-converter'}],
      0,'Com numerador 1: maior denominador = menor fracao. 1/6 menor que 1/4.'),
    dq('DA-FRAC6-EF05MA05-02','EF05MA05',
      'Qual decimal equivale a 3/5?',
      [{text:'0,6'},{text:'0,35',misconceptionCode:'decimal-sem-converter'},{text:'0,53',misconceptionCode:'compara-num-separado'},{text:'3,5',misconceptionCode:'maior-denominador-maior-fracao'}],
      0,'3 dividido por 5 = 0,6.'),
    dq('DA-FRAC6-EF04MA09-01','EF04MA09',
      'Um bolo foi cortado em 8 fatias iguais. Que fracao e 1 fatia?',
      [{text:'1/8'},{text:'8/1',misconceptionCode:'confunde-num-den'},{text:'1/7',misconceptionCode:'todo-nao-e-inteiro'},{text:'2/8',misconceptionCode:'parte-sem-partes-iguais'}],
      0,'8 partes iguais, 1 fatia = 1/8.'),
    dq('DA-FRAC6-EF04MA09-02','EF04MA09',
      'Qual fracao representa um terco?',
      [{text:'1/3'},{text:'3/1',misconceptionCode:'confunde-num-den'},{text:'1/4',misconceptionCode:'todo-nao-e-inteiro'},{text:'2/3',misconceptionCode:'parte-sem-partes-iguais'}],
      0,'Um terco = 1/3.'),
  ]
};

const DIAG_FRAC_5A = {
  id: 'DIAG-FRAC-5A',
  titulo: 'Diagnostico de Fracoes — 5o ano',
  descricao: 'Avaliacao diagnostica de fracoes para o 5o ano.',
  status: 'APPROVED',
  source: 'SPEAKFLOW',
  reviewNote: 'pacote de demonstracao, revisao pedagogica pendente',
  items: [
    dq('DI-FRAC5-EF05MA03-01','EF05MA03',
      'Uma turma de 20 alunos em 4 grupos iguais. Que fracao e 1 grupo?',
      [{text:'1/4'},{text:'5/20',misconceptionCode:'numerador-e-posicao'},{text:'4/20',misconceptionCode:'confunde-num-den'},{text:'1/5',misconceptionCode:'reta-sem-escala'}],
      0,'4 grupos iguais: 1 grupo = 1/4.'),
    dq('DI-FRAC5-EF05MA03-02','EF05MA03',
      'Reta de 0 a 1 em 5 partes. O terceiro traco marca:',
      [{text:'3/5'},{text:'5/3',misconceptionCode:'confunde-num-den'},{text:'1/5',misconceptionCode:'reta-sem-escala'},{text:'4/5',misconceptionCode:'numerador-e-posicao'}],
      0,'5 partes: 3o traco = 3/5.'),
    dq('DI-FRAC5-EF05MA04-01','EF05MA04',
      '2/3 e equivalente a 4/6?',
      [{text:'Sim, 2x2=4 e 3x2=6'},{text:'Nao, 2 diferente de 4',misconceptionCode:'equivalencia-visual-apenas'},{text:'Nao, denominadores diferentes',misconceptionCode:'mmc-nao-e-necessario'},{text:'Sim, somei',misconceptionCode:'soma-para-equivaler'}],
      0,'Multiplica por 2: 2/3=4/6.'),
    dq('DI-FRAC5-EF05MA04-02','EF05MA04',
      'Forma mais simplificada de 6/8:',
      [{text:'3/4'},{text:'4/8',misconceptionCode:'simplifica-so-num'},{text:'6/8 ja e simples',misconceptionCode:'equivalencia-visual-apenas'},{text:'1/2',misconceptionCode:'mmc-nao-e-necessario'}],
      0,'MDC(6,8)=2. 6/2=3, 8/2=4 = 3/4.'),
    dq('DI-FRAC5-EF05MA05-01','EF05MA05',
      'Qual e menor: 1/3 ou 1/5?',
      [{text:'1/5, cada quinto e menor que cada terco'},{text:'1/3',misconceptionCode:'maior-denominador-maior-fracao'},{text:'Sao iguais',misconceptionCode:'compara-num-separado'},{text:'1/5 e maior',misconceptionCode:'decimal-sem-converter'}],
      0,'Numerador 1: maior denominador = parte menor. 1/5 menor.'),
    dq('DI-FRAC5-EF05MA05-02','EF05MA05',
      'Qual decimal equivale a 2/5?',
      [{text:'0,4'},{text:'0,25',misconceptionCode:'decimal-sem-converter'},{text:'0,52',misconceptionCode:'compara-num-separado'},{text:'2,5',misconceptionCode:'maior-denominador-maior-fracao'}],
      0,'2 dividido por 5 = 0,4.'),
    dq('DI-FRAC5-EF04MA09-01','EF04MA09',
      'Um bolo em 8 fatias iguais. Que fracao e 1 fatia?',
      [{text:'1/8'},{text:'8/1',misconceptionCode:'confunde-num-den'},{text:'1/7',misconceptionCode:'todo-nao-e-inteiro'},{text:'2/8',misconceptionCode:'parte-sem-partes-iguais'}],
      0,'8 fatias iguais: 1 fatia = 1/8.'),
    dq('DI-FRAC5-EF04MA09-02','EF04MA09',
      'Qual fracao representa metade?',
      [{text:'1/2'},{text:'2/1',misconceptionCode:'confunde-num-den'},{text:'1/4',misconceptionCode:'todo-nao-e-inteiro'},{text:'2/4',misconceptionCode:'parte-sem-partes-iguais'}],
      0,'Metade = 1/2.'),
  ]
};

const DIAG_LP_5A = {
  id: 'DIAG-LP-5A',
  titulo: 'Diagnostico de Leitura — 5o ano',
  descricao: 'Avaliacao diagnostica de leitura para o 5o ano.',
  status: 'APPROVED',
  source: 'SPEAKFLOW',
  reviewNote: 'pacote de demonstracao, revisao pedagogica pendente',
  textos: LP_TEXTOS,
  items: [
    // EF15LP03
    dq('DI-LP5-EF15LP03-01','EF15LP03',
      'Leia o bilhete. Para onde Pedro foi?',
      [{text:'Na casa do Carlos'},{text:'No parque',misconceptionCode:'informacao-nao-esta-no-texto'},{text:'Na escola',misconceptionCode:'confunde-personagens'},{text:'Em casa da professora',misconceptionCode:'confunde-personagens'}],
      0,'O bilhete diz: "fui na casa do Carlos".'),
    dq('DI-LP5-EF15LP03-02','EF15LP03',
      'Leia o bilhete. A que horas Pedro disse que volta?',
      [{text:'Antes das 20h'},{text:'As 18h',misconceptionCode:'informacao-nao-esta-no-texto'},{text:'Depois das 20h',misconceptionCode:'informacao-distorcida'},{text:'Nao disse hora',misconceptionCode:'confunde-personagens'}],
      0,'O bilhete diz: "vou voltar antes das 20h".'),
    // EF35LP03
    dq('DI-LP5-EF35LP03-01','EF35LP03',
      'Leia o texto do gato e do rato. Qual e o assunto principal?',
      [{text:'A relacao entre o gato e o rato'},{text:'O sono dos gatos',misconceptionCode:'detalhe-como-ideia-central'},{text:'A vida no campo',misconceptionCode:'informacao-nao-esta-no-texto'},{text:'As arvores da floresta',misconceptionCode:'informacao-nao-esta-no-texto'}],
      0,'O texto gira em torno da relacao e tentativa do gato de enganar o rato.'),
    dq('DI-LP5-EF35LP03-02','EF35LP03',
      'Leia o texto do passeio. Qual e a ideia central?',
      [{text:'A turma da professora Laura foi ao parque e teve experiencias diferentes'},{text:'Joao viu uma borboleta azul',misconceptionCode:'detalhe-como-ideia-central'},{text:'A turma levou lanchinho',misconceptionCode:'detalhe-como-ideia-central'},{text:'O parque tem muitos passaros',misconceptionCode:'informacao-nao-esta-no-texto'}],
      0,'O texto conta sobre o passeio todo da turma e as diferentes experiencias.'),
    // EF35LP04
    dq('DI-LP5-EF35LP04-01','EF35LP04',
      'No bilhete, Pedro especifica o horario de volta. O que isso sugere?',
      [{text:'Que a mae de Pedro tem uma regra sobre horario de volta'},{text:'Que Pedro vai demorar muito',misconceptionCode:'informacao-distorcida'},{text:'Que Pedro nao quer jantar la',misconceptionCode:'informacao-distorcida'},{text:'Nao e possivel inferir',misconceptionCode:'nega-inferencia'}],
      0,'Pedro especificar o horario sugere que existe uma regra ou expectativa sobre isso.'),
    dq('DI-LP5-EF35LP04-02','EF35LP04',
      'No texto do passeio, a turma levou um saco para o lixo. O que isso sugere?',
      [{text:'Que a professora e a turma se preocupam com o meio ambiente'},{text:'Que iam fazer trabalho de ciencias',misconceptionCode:'inventa-informacao'},{text:'Que o parque e sujo',misconceptionCode:'informacao-distorcida'},{text:'Nada e possivel inferir',misconceptionCode:'nega-inferencia'}],
      0,'O saco de lixo sugere preocupacao com o ambiente.'),
    // EF35LP05
    dq('DI-LP5-EF35LP05-01','EF35LP05',
      '"O aluno ficou confuso com a explicacao. O professor teve que clarificar o assunto." "Clarificar" provavelmente significa:',
      [{text:'Explicar de forma mais clara'},{text:'Complicar mais',misconceptionCode:'sentido-oposto'},{text:'Desenhar no quadro',misconceptionCode:'sentido-nao-relacionado'},{text:'Nao e possivel saber',misconceptionCode:'nega-contexto'}],
      0,'O contexto mostra que clarificar e tornar mais claro.'),
    dq('DI-LP5-EF35LP05-02','EF35LP05',
      '"O problema era arduo, mas os alunos nao desistiram." "Arduo" provavelmente significa:',
      [{text:'Dificil e trabalhoso'},{text:'Facil e simples',misconceptionCode:'sentido-oposto'},{text:'Interessante',misconceptionCode:'sentido-nao-relacionado'},{text:'Breve',misconceptionCode:'sentido-nao-relacionado'}],
      0,'"Nao desistiram" sugere que o problema era um desafio, portanto arduo.'),
  ]
};

// ===== Escrever arquivos =====
writeFileSync(join(D, 'FRAC.json'), JSON.stringify(FRAC, null, 2));
writeFileSync(join(D, 'LP-05.json'), JSON.stringify(LP05, null, 2));

const diagDir = join(D, '../diagnosticos');
mkdirSync(diagDir, { recursive: true });
writeFileSync(join(diagDir, 'DIAG-FRAC-6A-INICIO.json'), JSON.stringify(DIAG_FRAC_6A_INICIO, null, 2));
writeFileSync(join(diagDir, 'DIAG-FRAC-6A-ACOMP.json'), JSON.stringify(DIAG_FRAC_6A_ACOMP, null, 2));
writeFileSync(join(diagDir, 'DIAG-FRAC-5A.json'), JSON.stringify(DIAG_FRAC_5A, null, 2));
writeFileSync(join(diagDir, 'DIAG-LP-5A.json'), JSON.stringify(DIAG_LP_5A, null, 2));

console.log('[ok] FRAC.json -', FRAC.trilhas.length, 'trilhas');
console.log('[ok] LP-05.json -', LP05.trilhas.length, 'trilhas');
console.log('[ok] DIAG-FRAC-6A-INICIO.json -', DIAG_FRAC_6A_INICIO.items.length, 'itens');
console.log('[ok] DIAG-FRAC-6A-ACOMP.json -', DIAG_FRAC_6A_ACOMP.items.length, 'itens');
console.log('[ok] DIAG-FRAC-5A.json -', DIAG_FRAC_5A.items.length, 'itens');
console.log('[ok] DIAG-LP-5A.json -', DIAG_LP_5A.items.length, 'itens');
console.log('\nTotal trilhas Fracoes:', FRAC.trilhas.length, '(esperado 8)');
console.log('Total trilhas Leitura:', LP05.trilhas.length, '(esperado 4)');
console.log('Total trilhas biblioteca:', FRAC.trilhas.length + LP05.trilhas.length, '(esperado 12)');

import { readFileSync, writeFileSync } from 'fs';
const fp = 'prisma/data/conteudo/trilhas/FRAC.json';
const f = JSON.parse(readFileSync(fp,'utf8'));

const o = (t,mc) => mc ? {text:t,misconceptionCode:mc} : {text:t};
const vv = (q,opts,ci) => ({question:q,options:opts,correctIndex:ci});
const Q = (q,opts,ci,exp,vars,chk) => {const r={question:q,options:opts,correctIndex:ci,explanation:exp,variants:vars};if(chk)r.check=chk;return r;};

const getA = (sc,aid) => f.find(x=>x.skillCode===sc).activities.find(a=>a.id===aid);

// === EF04MA09-A2: add 3rd question ===
const a04A2 = getA('EF04MA09','PK-EF04MA09-A2');
a04A2.questions.push(Q('Pedro tem 1/8 de um bloco: qual a representacao correta?',
  [o('O bloco foi dividido em 8 partes iguais e Pedro tem 1'),o('1 parte, sobrou 8','confunde-num-den'),o('8 partes, Pedro tem 8','todo-nao-e-inteiro'),o('16 partes, Pedro tem 1','parte-sem-partes-iguais')],
  0,'1/8: o bloco foi dividido em 8 partes iguais, Pedro tem 1.',
  [vv('Carla tem 1/5 de uma barra:',[o('5 partes iguais, Carla tem 1'),o('1 parte, sobrou 5','confunde-num-den'),o('5 partes, Carla tem 5','todo-nao-e-inteiro'),o('10 partes, Carla tem 1','parte-sem-partes-iguais')],0),
   vv('Joao tem 1/6 de uma fita:',[o('6 partes iguais, Joao tem 1'),o('1 parte, sobrou 6','confunde-num-den'),o('6 partes, Joao tem 6','todo-nao-e-inteiro'),o('12 partes, Joao tem 1','parte-sem-partes-iguais')],0)]
));

// === EF04MA09-A4: add 2 more questions ===
const a04A4 = getA('EF04MA09','PK-EF04MA09-A4');
a04A4.questions.push(Q('Uma corda foi cortada em 10 partes iguais. Paulo ficou com 1 parte. Que fracao?',
  [o('1/10'),o('10/1','confunde-num-den'),o('1/9','todo-nao-e-inteiro'),o('2/10','parte-sem-partes-iguais')],
  0,'10 partes iguais, Paulo tem 1. Fracao = 1/10.',
  [vv('Uma fita em 12 partes iguais. Lara ficou com 1.',[o('1/12'),o('12/1','confunde-num-den'),o('1/11','todo-nao-e-inteiro'),o('2/12','parte-sem-partes-iguais')],0),
   vv('Uma manga em 4 partes. Renato comeu 1.',[o('1/4'),o('4/1','confunde-num-den'),o('1/3','todo-nao-e-inteiro'),o('2/4','parte-sem-partes-iguais')],0)]
));
a04A4.questions.push(Q('Uma horta tem 6 canteiros iguais. 1 tem alface. Que fracao do total e alface?',
  [o('1/6'),o('6/1','confunde-num-den'),o('1/5','todo-nao-e-inteiro'),o('1/3','parte-sem-partes-iguais')],
  0,'6 canteiros iguais, 1 e alface. Fracao = 1/6.',
  [vv('Uma prateleira tem 8 livros. 1 e dicionario.',[o('1/8'),o('8/1','confunde-num-den'),o('1/7','todo-nao-e-inteiro'),o('2/8','parte-sem-partes-iguais')],0),
   vv('Uma garrafa tem 5 partes iguais. 1 foi servida.',[o('1/5'),o('5/1','confunde-num-den'),o('1/4','todo-nao-e-inteiro'),o('2/5','parte-sem-partes-iguais')],0)]
));

// === EF05MA03-A1 to A4: add missing questions ===
const extra03 = [
  Q('Uma turma de 15 alunos em 3 grupos iguais. Que fracao e 1 grupo?',
    [o('1/3'),o('3/1','numerador-e-posicao'),o('3/15','confunde-num-den'),o('1/5','reta-sem-escala')],
    0,'3 grupos iguais, 1 grupo = 1/3.',
    [vv('10 alunos em 5 grupos. Que fracao e 1 grupo?',[o('1/5'),o('5/1','numerador-e-posicao'),o('5/10','confunde-num-den'),o('1/2','reta-sem-escala')],0),
     vv('12 alunos em 4 grupos. Que fracao e 1 grupo?',[o('1/4'),o('4/1','numerador-e-posicao'),o('4/12','confunde-num-den'),o('1/3','reta-sem-escala')],0)]),
  Q('Para marcar 2/5 na reta de 0 a 1, divido em quantas partes?',
    [o('5 partes e conto 2'),o('2 partes e conto 5','numerador-e-posicao'),o('10 partes','reta-sem-escala'),o('7 partes','fracao-maior-1-impossivel')],
    0,'Denominador 5 define o numero de partes. Numerador 2 define a posicao.',
    [vv('Para 3/4 na reta, divido em:',[o('4 partes e conto 3'),o('3 partes','numerador-e-posicao'),o('12 partes','reta-sem-escala'),o('7 partes','fracao-maior-1-impossivel')],0),
     vv('Para 1/6 na reta, divido em:',[o('6 partes e conto 1'),o('1 parte','numerador-e-posicao'),o('36 partes','reta-sem-escala'),o('7 partes','fracao-maior-1-impossivel')],0)]),
  Q('Ana acertou 8 de 10 questoes. Que fracao?',
    [o('8/10'),o('10/8','confunde-num-den'),o('2/10','numerador-e-posicao'),o('8/2','fracao-maior-1-impossivel')],
    0,'Total=10, acertos=8. Fracao=8/10.',
    [vv('Pedro ganhou 7 de 8 rodadas. Que fracao?',[o('7/8'),o('8/7','confunde-num-den'),o('1/8','numerador-e-posicao'),o('7/1','fracao-maior-1-impossivel')],0),
     vv('Equipe marcou 5 de 6 vezes. Que fracao?',[o('5/6'),o('6/5','confunde-num-den'),o('1/6','numerador-e-posicao'),o('5/1','fracao-maior-1-impossivel')],0)]),
  Q('Uma caixa tem 20 itens. 15 sao bolas. Que fracao e bolas?',
    [o('15/20'),o('20/15','confunde-num-den'),o('5/20','numerador-e-posicao'),o('15/5','fracao-maior-1-impossivel')],
    0,'Total=20, bolas=15. Fracao=15/20.',
    [vv('Uma cesta tem 12 frutas. 9 sao maca. Que fracao?',[o('9/12'),o('12/9','confunde-num-den'),o('3/12','numerador-e-posicao'),o('9/3','fracao-maior-1-impossivel')],0),
     vv('Uma turma tem 30 livros. 24 sao de ficcao. Que fracao?',[o('24/30'),o('30/24','confunde-num-den'),o('6/30','numerador-e-posicao'),o('24/6','fracao-maior-1-impossivel')],0)])
];
['A1','A2','A3','A4'].forEach((s,i) => {
  const a = getA('EF05MA03','PK-EF05MA03-'+s);
  if(a && a.questions.length < 3) a.questions.push(extra03[i]);
});

// === EF05MA04-A1 to A4: add missing questions ===
const extra04 = [
  [Q('3/5 e equivalente a 6/10?',
    [o('Sim, 3x2=6 e 5x2=10'),o('Nao, 3 diferente de 6','equivalencia-visual-apenas'),o('Nao, denominadores diferentes','mmc-nao-e-necessario'),o('Sim, somei','soma-para-equivaler')],
    0,'Multiplica por 2: 6/10.',
    [vv('1/4 e equivalente a 2/8?',[o('Sim, 1x2=2 e 4x2=8'),o('Nao, 1 diferente de 2','equivalencia-visual-apenas'),o('Nao, denominadores diferentes','mmc-nao-e-necessario'),o('Sim, somei','soma-para-equivaler')],0),
     vv('4/5 e equivalente a 8/10?',[o('Sim, 4x2=8 e 5x2=10'),o('Nao, 4 diferente de 8','equivalencia-visual-apenas'),o('Nao, denominadores diferentes','mmc-nao-e-necessario'),o('Sim, somei','soma-para-equivaler')],0)]),
   Q('Qual e o equivalente de 1/3 com denominador 9?',
    [o('3/9'),o('1/9','equivalencia-visual-apenas'),o('3/3','soma-para-equivaler'),o('9/1','mmc-nao-e-necessario')],
    0,'1/3 multiplicado por 3/3 = 3/9.',
    [vv('Equivalente de 2/3 com denominador 9?',[o('6/9'),o('2/9','equivalencia-visual-apenas'),o('6/6','soma-para-equivaler'),o('9/2','mmc-nao-e-necessario')],0),
     vv('Equivalente de 1/4 com denominador 12?',[o('3/12'),o('1/12','equivalencia-visual-apenas'),o('3/3','soma-para-equivaler'),o('12/1','mmc-nao-e-necessario')],0)])],
  [Q('Qual e a forma mais simplificada de 4/8?',
    [o('1/2'),o('2/8','simplifica-so-num'),o('4/8 ja e simples','equivalencia-visual-apenas'),o('2/4','mmc-nao-e-necessario')],
    0,'MDC(4,8)=4. 4/4=1, 8/4=2. Resultado: 1/2.',
    [vv('Forma mais simplificada de 3/9?',[o('1/3'),o('1/9','simplifica-so-num'),o('3/9 ja e simples','equivalencia-visual-apenas'),o('3/3','mmc-nao-e-necessario')],0),
     vv('Forma mais simplificada de 5/10?',[o('1/2'),o('1/10','simplifica-so-num'),o('5/10 ja e simples','equivalencia-visual-apenas'),o('5/5','mmc-nao-e-necessario')],0)]),
   Q('Simplifique 15/20.',
    [o('3/4'),o('3/20','simplifica-so-num'),o('15/20 ja e simples','equivalencia-visual-apenas'),o('5/4','mmc-nao-e-necessario')],
    0,'MDC(15,20)=5. 15/5=3, 20/5=4. Resultado: 3/4.',
    [vv('Simplifique 12/16.',[o('3/4'),o('2/16','simplifica-so-num'),o('12/16 ja e simples','equivalencia-visual-apenas'),o('4/4','mmc-nao-e-necessario')],0),
     vv('Simplifique 10/25.',[o('2/5'),o('2/25','simplifica-so-num'),o('10/25 ja e simples','equivalencia-visual-apenas'),o('5/5','mmc-nao-e-necessario')],0)])],
  [Q('Equivalente de 5/6 com denominador 18?',
    [o('15/18'),o('5/18','equivalencia-visual-apenas'),o('15/15','soma-para-equivaler'),o('18/5','mmc-nao-e-necessario')],
    0,'5/6 multiplicado por 3/3 = 15/18.',
    [vv('Equivalente de 3/4 com denominador 20?',[o('15/20'),o('3/20','equivalencia-visual-apenas'),o('15/15','soma-para-equivaler'),o('20/3','mmc-nao-e-necessario')],0),
     vv('Equivalente de 2/5 com denominador 25?',[o('10/25'),o('2/25','equivalencia-visual-apenas'),o('10/10','soma-para-equivaler'),o('25/2','mmc-nao-e-necessario')],0)]),
   Q('Pedro tem 6/12 de uma barra. Renata tem 1/2. Quem tem mais?',
    [o('Sao iguais, pois 6/12=1/2'),o('Pedro, 6 maior que 1','equivalencia-visual-apenas'),o('Renata, 2 menor que 12','mmc-nao-e-necessario'),o('Nao e possivel comparar','soma-para-equivaler')],
    0,'6/12=1/2. Sao iguais.',
    [vv('Ana tem 8/16. Carlos tem 1/2. Quem tem mais?',[o('Sao iguais'),o('Ana','equivalencia-visual-apenas'),o('Carlos','mmc-nao-e-necessario'),o('Nao e possivel','soma-para-equivaler')],0),
     vv('Lara tem 9/12. Bia tem 3/4. Quem tem mais?',[o('Sao iguais'),o('Lara','equivalencia-visual-apenas'),o('Bia','mmc-nao-e-necessario'),o('Nao e possivel','soma-para-equivaler')],0)])],
  [Q('Qual e o equivalente de 4/6 com denominador 3?',
    [o('2/3'),o('4/3','equivalencia-visual-apenas'),o('4/18','soma-para-equivaler'),o('3/4','mmc-nao-e-necessario')],
    0,'4/6 dividido por 2 = 2/3.',
    [vv('Equivalente de 6/9 com denominador 3?',[o('2/3'),o('6/3','equivalencia-visual-apenas'),o('6/27','soma-para-equivaler'),o('3/6','mmc-nao-e-necessario')],0),
     vv('Equivalente de 8/12 com denominador 3?',[o('2/3'),o('8/3','equivalencia-visual-apenas'),o('8/36','soma-para-equivaler'),o('3/8','mmc-nao-e-necessario')],0)]),
   Q('Luiza tem 10/14 de tinta. Simplificando ela tem:',
    [o('5/7'),o('2/14','simplifica-so-num'),o('10/14 ja e simples','equivalencia-visual-apenas'),o('7/10','mmc-nao-e-necessario')],
    0,'MDC(10,14)=2. 10/2=5, 14/2=7. Resultado: 5/7.',
    [vv('Simplifique 6/14.',[o('3/7'),o('1/14','simplifica-so-num'),o('6/14 ja e simples','equivalencia-visual-apenas'),o('7/6','mmc-nao-e-necessario')],0),
     vv('Simplifique 9/15.',[o('3/5'),o('3/15','simplifica-so-num'),o('9/15 ja e simples','equivalencia-visual-apenas'),o('5/9','mmc-nao-e-necessario')],0)])]
];
['A1','A2','A3','A4'].forEach((s,i) => {
  const a = getA('EF05MA04','PK-EF05MA04-'+s);
  if(a && a.questions.length < 3) extra04[i].forEach(q => a.questions.push(q));
});

// === EF05MA05-A1 to A4: add missing questions ===
const extra05 = [
  [Q('Qual e menor: 2/9 ou 5/9?',
    [o('2/9, pois 2 menor que 5'),o('5/9','compara-num-separado'),o('Sao iguais','maior-denominador-maior-fracao'),o('2/9 e maior','decimal-sem-converter')],
    0,'Mesmo denominador: menor numerador = menor fracao.',
    [vv('Qual e maior: 6/11 ou 4/11?',[o('6/11'),o('4/11','compara-num-separado'),o('Sao iguais','maior-denominador-maior-fracao'),o('4/11 e maior','decimal-sem-converter')],0),
     vv('Qual e menor: 3/8 ou 7/8?',[o('3/8'),o('7/8','compara-num-separado'),o('Sao iguais','maior-denominador-maior-fracao'),o('7/8 e menor','decimal-sem-converter')],0)]),
   Q('Qual decimal equivale a 1/5?',
    [o('0,2'),o('0,15','decimal-sem-converter'),o('0,51','compara-num-separado'),o('1,5','maior-denominador-maior-fracao')],
    0,'1 dividido por 5 = 0,2.',
    [vv('Decimal de 3/5?',[o('0,6'),o('0,35','decimal-sem-converter'),o('0,53','compara-num-separado'),o('3,5','maior-denominador-maior-fracao')],0),
     vv('Decimal de 4/5?',[o('0,8'),o('0,45','decimal-sem-converter'),o('0,54','compara-num-separado'),o('4,5','maior-denominador-maior-fracao')],0)])],
  [Q('Coloque em ordem crescente: 1/4, 3/8, 1/2.',
    [o('1/4 menor que 3/8 menor que 1/2'),o('1/2 menor que 3/8 menor que 1/4','maior-denominador-maior-fracao'),o('3/8 menor que 1/4 menor que 1/2','compara-num-separado'),o('Sao iguais','decimal-sem-converter')],
    0,'MMC=8. 1/4=2/8; 3/8=3/8; 1/2=4/8.',
    [vv('Ordem crescente: 2/3, 1/2, 5/6.',[o('1/2 menor que 2/3 menor que 5/6'),o('5/6 menor que 2/3 menor que 1/2','maior-denominador-maior-fracao'),o('2/3 menor que 1/2 menor que 5/6','compara-num-separado'),o('Sao iguais','decimal-sem-converter')],0),
     vv('Ordem crescente: 3/4, 2/5, 1/2.',[o('2/5 menor que 1/2 menor que 3/4'),o('3/4 menor que 1/2 menor que 2/5','maior-denominador-maior-fracao'),o('1/2 menor que 2/5 menor que 3/4','compara-num-separado'),o('Sao iguais','decimal-sem-converter')],0)]),
   Q('Decimal de 7/10?',
    [o('0,7'),o('0,17','decimal-sem-converter'),o('0,71','compara-num-separado'),o('7,0','maior-denominador-maior-fracao')],
    0,'7 dividido por 10 = 0,7.',
    [vv('Decimal de 9/10?',[o('0,9'),o('0,19','decimal-sem-converter'),o('0,91','compara-num-separado'),o('9,0','maior-denominador-maior-fracao')],0),
     vv('Decimal de 3/10?',[o('0,3'),o('0,13','decimal-sem-converter'),o('0,31','compara-num-separado'),o('3,0','maior-denominador-maior-fracao')],0)])],
  [Q('Coloque em ordem decrescente: 5/6, 2/3, 3/4.',
    [o('5/6 maior que 3/4 maior que 2/3'),o('2/3 maior que 3/4 maior que 5/6','maior-denominador-maior-fracao'),o('3/4 maior que 5/6 maior que 2/3','compara-num-separado'),o('Sao iguais','decimal-sem-converter')],
    0,'5/6 aprox 0,833; 3/4=0,75; 2/3 aprox 0,667.',
    [vv('Ordem decrescente: 7/8, 3/4, 5/6.',[o('7/8 maior que 5/6 maior que 3/4'),o('3/4 maior que 5/6 maior que 7/8','maior-denominador-maior-fracao'),o('5/6 maior que 7/8 maior que 3/4','compara-num-separado'),o('Sao iguais','decimal-sem-converter')],0),
     vv('Ordem decrescente: 2/5, 1/3, 3/8.',[o('2/5 maior que 3/8 maior que 1/3'),o('1/3 maior que 2/5 maior que 3/8','maior-denominador-maior-fracao'),o('3/8 maior que 2/5 maior que 1/3','compara-num-separado'),o('Sao iguais','decimal-sem-converter')],0)]),
   Q('Decimal de 1/8?',
    [o('0,125'),o('0,18','decimal-sem-converter'),o('0,81','compara-num-separado'),o('1,8','maior-denominador-maior-fracao')],
    0,'1 dividido por 8 = 0,125.',
    [vv('Decimal de 3/8?',[o('0,375'),o('0,38','decimal-sem-converter'),o('0,83','compara-num-separado'),o('3,8','maior-denominador-maior-fracao')],0),
     vv('Decimal de 5/8?',[o('0,625'),o('0,58','decimal-sem-converter'),o('0,85','compara-num-separado'),o('5,8','maior-denominador-maior-fracao')],0)])],
  [Q('Marcos pagou R$ 0,60. Uma figurinha custa 2/3 de real. Ele tem?',
    [o('Nao, 2/3 aprox 0,667 maior que 0,60'),o('Sim, fracao menor','decimal-sem-converter'),o('Sim, R$0,60 maior que 2','compara-num-separado'),o('Nao, 3 maior que 0,60','maior-denominador-maior-fracao')],
    0,'2/3 aprox 0,667. Marcos tem 0,60. 0,60 menor que 0,667: nao tem.',
    [vv('Ana tem R$0,80. Pipa custa 3/4. Ela tem?',[o('Sim, 3/4=0,75 e ela tem R$0,80'),o('Nao','decimal-sem-converter'),o('Sim, 0,80 maior que 3','compara-num-separado'),o('Nao, 4 maior que 0,80','maior-denominador-maior-fracao')],0),
     vv('Luis tem R$0,45. Borracha custa 1/2. Ele tem?',[o('Nao, 1/2=0,50 e ele tem R$0,45'),o('Sim','decimal-sem-converter'),o('Sim, 0,45 maior que 1','compara-num-separado'),o('Nao, 2 maior que 0,45','maior-denominador-maior-fracao')],0)]),
   Q('Decimal de 1/8?',
    [o('0,125'),o('0,18','decimal-sem-converter'),o('0,81','compara-num-separado'),o('1,8','maior-denominador-maior-fracao')],
    0,'1 dividido por 8 = 0,125.',
    [vv('Decimal de 3/8?',[o('0,375'),o('0,38','decimal-sem-converter'),o('0,83','compara-num-separado'),o('3,8','maior-denominador-maior-fracao')],0),
     vv('Decimal de 5/8?',[o('0,625'),o('0,58','decimal-sem-converter'),o('0,85','compara-num-separado'),o('5,8','maior-denominador-maior-fracao')],0)])]
];
['A1','A2','A3','A4'].forEach((s,i) => {
  const a = getA('EF05MA05','PK-EF05MA05-'+s);
  if(a && a.questions.length < 3) extra05[i].forEach(q => a.questions.push(q));
});

// === EF06MA09-A4-Q3: fix duplicate ===
const a09_4 = getA('EF06MA09','PK-EF06MA09-A4');
a09_4.questions[3] = Q('Uma escola arrecadou R$ 480. 3/8 foi para materiais e 1/4 para o lanche. Quanto sobrou?',
  [o('R$ 180, pois gastou 180 mais 120 = 300, sobrou 180'),o('R$ 300, o gasto','fracao-quantid-subtrai'),o('R$ 480','fracao-quantid-soma'),o('R$ 4800','fracao-quantid-multiplica')],
  0,'3/8 vezes 480 = 180. 1/4 vezes 480 = 120. Sobrou: 480 menos 180 menos 120 = 180.',
  [vv('Uma turma arrecadou R$ 240. Gastou 1/4 no lanche e 1/3 em materiais. Quanto sobrou?',
    [o('R$ 100, pois gastou 60 mais 80 = 140, sobrou 100'),o('R$ 140','fracao-quantid-subtrai'),o('R$ 240','fracao-quantid-soma'),o('R$ 2400','fracao-quantid-multiplica')],0),
   vv('Uma fazenda tem 360 animais. 2/9 sao caprinos e 1/4 sao bovinos. Quantos sao outros?',
    [o('170, pois 2/9 vezes 360=80 e 1/4 vezes 360=90, 360-80-90=190'),o('90','fracao-quantid-subtrai'),o('360','fracao-quantid-soma'),o('3600','fracao-quantid-multiplica')],0)]
);

writeFileSync(fp, JSON.stringify(f, null, 2));
console.log('FRAC.json atualizado');

// verify
let errs = 0;
for(const t of f){
  for(const a of t.activities){
    const n = (a.questions||[]).length;
    if(a.type !== 'SPOKEN' && a.type !== 'WRITTEN' && n < 3){
      console.log('AINDA FALTA:', t.skillCode, a.id, n);errs++;
    }
  }
}
if(!errs) console.log('Todas as atividades quiz tem 3+ questoes');

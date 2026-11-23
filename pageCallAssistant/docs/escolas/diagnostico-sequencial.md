# Como o diagnóstico decide o degrau de cada aluno

O diagnóstico não conta acertos numa lista fixa. Ele decide, questão a questão,
se o aluno domina cada habilidade, e só para quando a evidência é suficiente.
A regra é o **teste sequencial da razão de probabilidades** (Wald, 1945), o mesmo
princípio dos testes adaptativos usados em certificações.

## O modelo

Para cada habilidade da BNCC, o sistema compara duas hipóteses:

| Hipótese | Chance de acertar uma questão de 4 alternativas |
|---|---|
| O aluno **domina** a habilidade | 90% (pode errar 10% por descuido) |
| O aluno **não domina** | 25% (acerta só no chute) |

Cada resposta soma evidência:

- acerto: + ln(0,90 / 0,25) ≈ **+1,28**
- erro: + ln(0,10 / 0,75) ≈ **−2,01**

Começando de 50% para cada lado, a probabilidade de o aluno dominar é
1 / (1 + e^(−evidência)).

## A decisão

- evidência ≥ ln(19) ≈ 2,94 → **domina** (95% de confiança)
- evidência ≤ −2,94 → **ainda não domina** (95% de confiança)
- no meio → mais uma questão da mesma habilidade, até **8**
- se depois de 8 ainda estiver no meio → **quase lá** (as respostas não permitem afirmar nenhum dos dois)

Na prática: **3 acertos seguidos = domina; 2 erros seguidos = ainda não**.
Respostas misturadas pedem mais questões. Depois da decisão, o sistema não faz
mais questões daquela habilidade e não volta atrás.

## O degrau

Quando a regra decide **ainda não**, o aluno desce para o pré-requisito daquela
habilidade (mapa de pré-requisitos da BNCC, aprovado pela equipe pedagógica) e o
mesmo teste é aplicado nele. São no máximo **2 degraus para trás** e **40 questões
por sessão**. A trilha começa na habilidade mais básica em que o aluno ainda não
domina.

## Taxas de acerto da regra

Calculadas de forma exata, somando todas as sequências de respostas possíveis
(função `taxasDaRegra`, conferida nos testes automáticos):

| | Domina | Ainda não | Quase lá | Média de questões |
|---|---|---|---|---|
| Aluno que **domina** (acerta 90%) | **96,8%** | 1,6% | 1,5% | 3,7 |
| Aluno que **não domina** (chuta) | 2,5% | **94,5%** | 3,0% | 3,2 |

Ou seja: um aluno que só chuta é dado como "domina" em 2,5% das vezes; um aluno
que domina é mandado para o reforço por engano em 1,6% das vezes.

## Cuidados

- As questões extras de confirmação vêm das atividades publicadas da própria
  habilidade e sempre têm 4 alternativas, como o modelo supõe.
- Respostas em menos de 5 segundos são recusadas (evita clicar sem ler).
- O nível vai para o histórico do aluno uma vez por habilidade, no fim da sessão.
  Depois, a prática nas trilhas atualiza esse nível.

Código: `lib/escola/diagnostico-sequencial.ts` e
`app/api/escola/aluno/diagnostico/sessao/route.ts`.

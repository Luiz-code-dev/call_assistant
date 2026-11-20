# SpeakFlow Escolas: preparo para rodar na AWS, separado do SpeakFlow IA

Este documento descreve o que o código já oferece para subir o SpeakFlow Escolas sozinho,
a partir da mesma imagem, sem alterar o ambiente atual (Railway).

**Regra de segurança da mudança:** tudo aqui é ligado por variável de ambiente. Sem as
variáveis abaixo, o sistema se comporta exatamente como antes.

## Variáveis novas

| Variável | Valor | O que faz |
|---|---|---|
| `APP_SCOPE` | `escolas` | A instância serve só o Escolas. Não migra o banco do SpeakFlow IA, não liga as rotinas dele e leva qualquer página que não seja do Escolas para `/escola/inicio`. |
| `ESCOLAS_PUBLIC_URL` | `https://endereco-do-escolas` | Endereço próprio do Escolas. Passa a valer em todos os links (QR, cartões, e-mails, convites). Lida em tempo de execução. |
| `ESCOLAS_AGENDADORES` | `externo` | Os lembretes deixam de rodar dentro do servidor e passam a ser chamados por um agendador de fora (ver abaixo). Opcional. |
| `ESCOLAS_PROXY_HOPS` | número | Quantos proxies existem entre a internet e o servidor, para ler o IP de quem chama a API de integração. Padrão `1`. |

`NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_VAPID_KEY` continuam sendo argumentos de construção da
imagem (`Dockerfile`). Para um endereço novo, prefira `ESCOLAS_PUBLIC_URL`, que não exige
reconstruir a imagem.

## O que `APP_SCOPE=escolas` muda

1. **Inicialização (`scripts/start.sh`)**: pula `prisma migrate deploy` do banco do
   SpeakFlow IA. `DATABASE_URL` não precisa existir nesta instância.
2. **Rotinas (`instrumentation.ts`)**: não liga `lib/cron-runner` (desafios e dica diária
   do SpeakFlow IA).
3. **Middleware**:
   - chamada sem https volta para https no mesmo endereço (o redirecionamento para o
     domínio do SpeakFlow IA não se aplica);
   - páginas que não são do Escolas levam para `/escola/inicio`;
   - arquivos públicos e `/.well-known/` seguem liberados.
4. **Sessões do SpeakFlow IA**: `JWT_SECRET` recebe um valor aleatório a cada inicialização,
   para que nenhuma sessão do SpeakFlow IA seja aceita. O Escolas usa `EDU_JWT_SECRET`,
   `EDU_STUDENT_JWT_SECRET` e `EDU_FAMILY_JWT_SECRET`, que precisam ser **iguais em todas as
   instâncias** e iguais aos do ambiente atual, para as sessões abertas continuarem valendo.

O middleware não cobre `/api/*`. As rotas de API do SpeakFlow IA continuam existindo na
imagem, mas sem banco e sem sessão válida. **No balanceador, encaminhe só os caminhos do
Escolas** e responda 404 para o resto:

```
/escola*   /api/escola/*   /verificar*   /_next/*   /escola-icons/*
/escola-manifest.json   /sw.js   /.well-known/*   /icon.png   /favicon.ico
```

## Sinal de vida

- `GET /api/escola/health` responde `{ "ok": true }` sem tocar em banco. Use no balanceador.
- `GET /api/escola/health?completo=1` com `Authorization: Bearer <CRON_SECRET>` confere o
  catálogo e o banco de cada rede ativa e informa o modo da instância. Responde 503 se algo
  falhar. Use antes de virar o tráfego.

## Mais de uma instância: o que já é seguro

| Ponto | Situação |
|---|---|
| Migrações, BNCC e importação de conteúdo na subida | Usam trava no banco (`pg_advisory_lock`). Várias instâncias podem subir juntas. |
| Lembrete da agenda | Cada horário é marcado no banco antes do envio. Duas instâncias não avisam em dobro. |
| Avisos à família | Índice único por responsável, aluno, tipo e dia. Não há aviso em dobro. |
| Bloqueio de login (equipe, aluno, responsável, código da família) | Contadores e bloqueio ficam no banco. Valem em todas as instâncias. |
| Sessões | Tokens assinados; não há sessão guardada em memória. |
| Áudios | Armazenamento externo (`EDU_AUDIO_*`); nada é gravado em disco local. |

## Mais de uma instância: o que vale por instância

| Ponto | Efeito | Encaminhamento |
|---|---|---|
| Limite de chamadas da API de integração | Com N instâncias, o limite efetivo é N vezes maior. | Regra de taxa no WAF do balanceador. |
| Limite de pedidos de suporte da família | Idem. | Regra de taxa no WAF. |
| Cache de 60 s de revalidação de sessão e de endereços de aviso | Uma mudança pode levar até 60 s para valer em todas as instâncias (já é assim hoje). | Aceitável. |

## Agendador externo (opcional)

Com `ESCOLAS_AGENDADORES=externo`, crie as chamadas abaixo, todas com
`Authorization: Bearer <CRON_SECRET>`:

| Rota | Frequência |
|---|---|
| `POST /api/escola/cron/agenda` | a cada minuto |
| `POST /api/escola/cron/avisos-familia` | a cada 10 minutos |
| `POST /api/escola/cron/evaluate` | a cada minuto (já existe hoje) |
| `POST /api/escola/cron/inatividade` | diária (já existe hoje) |

As duas primeiras recusam a chamada se `CRON_SECRET` não estiver configurada. As duas
últimas, quando `CRON_SECRET` não existe, aceitam qualquer chamada: **configure `CRON_SECRET`
em todos os ambientes**.

Sem `ESCOLAS_AGENDADORES`, os lembretes continuam rodando dentro de cada instância, o que é
correto com qualquer número de instâncias (ver tabela acima), só repete a consulta.

## Variáveis que a instância do Escolas precisa

`ESCOLAS_CATALOG_URL`, `ESCOLAS_DB_01_URL`, `ESCOLAS_DB_02_URL`, `ESCOLAS_APP_DB_PASSWORD`,
`EDU_JWT_SECRET`, `EDU_STUDENT_JWT_SECRET`, `EDU_FAMILY_JWT_SECRET`, `CRON_SECRET`,
`OPENAI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM_ESCOLA`, `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `EDU_AUDIO_*`, `FEATURE_ESCOLAS*`.

Não precisa: `DATABASE_URL`, `JWT_SECRET`, chaves do Stripe.

## Ainda fora do código

- Infraestrutura na AWS (rede, bancos, serviço, balanceador com WAF, cofre de segredos).
- Cópia dos três bancos e dos áudios, com ensaio.
- Decisão do endereço: próprio do Escolas ou dividir o endereço atual por caminho.
- Texto fixo `www.speakflow.ia.br` na tela de suporte da família.
- Remetentes de e-mail com domínio `speakflow.ia.br` (dependem do domínio verificado no Resend).
